import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { FREE_DAILY_LIMIT, DAILY_HINT_RECHARGE, MAX_HINT_POINTS } from '@/lib/game/levelConfig'
import { rateLimit, rateLimitResponse } from '@/lib/api/rateLimit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 30 question requests per minute per user
  const { limited } = rateLimit(`question:${user.id}`, { max: 30, windowMs: 60_000 })
  if (limited) return rateLimitResponse()

  const service = await createServiceClient()
  // KST(UTC+9) 기준 오늘 날짜
  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const today = new Date(now.getTime() + kstOffset).toISOString().split('T')[0]

  // 프로필 조회
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // 구독 만료 체크 — 만료 시 자동으로 free로 전환
  if (
    profile.subscription_status === 'active' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) < new Date()
  ) {
    await service
      .from('profiles')
      .update({ subscription_status: 'free' })
      .eq('id', user.id)
    profile.subscription_status = 'free'
  }

  // 일일 힌트 포인트 자동 충전 (날짜 변경 시 1회)
  let currentHintPoints = profile.hint_points
  const { data: rechargedPoints } = await service.rpc('recharge_hint_points_if_needed', {
    uid: user.id,
    recharge_amount: DAILY_HINT_RECHARGE,
    max_points: MAX_HINT_POINTS,
    today_date: today,
  })
  if (rechargedPoints != null && rechargedPoints >= 0) {
    currentHintPoints = rechargedPoints
  }

  // 관리자는 모든 제한 면제
  const isAdmin = profile.role === 'admin'
  const isUnlimited = isAdmin || profile.subscription_status === 'active'

  // 무료 사용자: 원자적 일일 제한 체크 + 소비 (race condition 방지)
  if (!isUnlimited) {
    const { data: allowed } = await service.rpc('check_and_consume_daily_question', {
      uid: user.id,
      lim: FREE_DAILY_LIMIT,
      today_date: today,
    })

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'daily_limit_reached',
          used: FREE_DAILY_LIMIT,
          limit: FREE_DAILY_LIMIT,
        },
        { status: 403 },
      )
    }
  }

  // 무료 사용자는 RPC에서 이미 +1 소비됨 — 현재 사용량 재조회
  let dailyUsed = profile.daily_questions_used
  if (!isUnlimited) {
    const { data: freshProfile } = await service
      .from('profiles')
      .select('daily_questions_used')
      .eq('id', user.id)
      .single()
    dailyUsed = freshProfile?.daily_questions_used ?? dailyUsed
  }

  const { searchParams } = new URL(req.url)
  const questionId = searchParams.get('id')
  const maxLevel = isAdmin ? 7 : profile.current_level
  const requestedLevel = parseInt(searchParams.get('level') ?? '0') || profile.current_level
  const level = Math.max(1, Math.min(maxLevel, requestedLevel))
  const VALID_TOPICS = ['humanities', 'social', 'science', 'tech', 'arts']
  const topicParam = searchParams.get('topic')
  const topic = topicParam && VALID_TOPICS.includes(topicParam) ? topicParam : null

  // 특정 문제 ID로 조회
  if (questionId) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(questionId)) {
      return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 })
    }

    const { data: specificQuestion, error: sqError } = await service
      .from('questions')
      .select('id, difficulty_level, topic, passage, sentences, conclusion, hints')
      .eq('id', questionId)
      .single()

    if (sqError || !specificQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // 레벨 제한: 사용자가 접근할 수 없는 레벨의 문제 차단
    if (!isAdmin && specificQuestion.difficulty_level > profile.current_level) {
      return NextResponse.json({ error: 'Level not unlocked' }, { status: 403 })
    }

    return NextResponse.json({
      question: specificQuestion,
      hint_points: currentHintPoints,
      daily_used: dailyUsed,
      daily_limit: isUnlimited ? null : FREE_DAILY_LIMIT,
      subscription_status: isUnlimited ? 'active' : profile.subscription_status,
      invite_code: profile.invite_code ?? null,
    })
  }

  // 이미 푼 문제 제외 (1회 쿼리로 통합)
  const { data: solved } = await service
    .from('user_progress')
    .select('question_id, is_correct')
    .eq('user_id', user.id)

  const allSolvedIds = solved?.map((s) => s.question_id) ?? []
  const isFirstTime = allSolvedIds.length === 0

  // UUID 형식 검증 (SQL 인젝션 방지)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const safeIds = solved
    ?.filter((s) => s.is_correct && typeof s.question_id === 'string' && UUID_RE.test(s.question_id))
    .map((s) => s.question_id) ?? []

  // 문제 조회
  let query = service
    .from('questions')
    .select('id, difficulty_level, topic, passage, sentences, conclusion, hints')
    .eq('difficulty_level', level)

  if (topic) {
    query = query.eq('topic', topic)
  }

  if (safeIds.length > 0) {
    query = query.not('id', 'in', `(${safeIds.join(',')})`)
  }

  // 첫 사용자: 가장 오래된(쉬운) 문제 1개 / 기존 사용자: 랜덤 10개
  if (isFirstTime) {
    query = query.order('created_at', { ascending: true }).limit(1)
  } else {
    query = query.limit(10)
  }

  const { data: questions, error: qError } = await query

  // 새 문제가 없으면 이미 푼 문제에서 복습 모드로 제공
  let isReview = false
  let pool: typeof questions = questions

  if (qError || !questions?.length) {
    const { data: reviewQuestions } = await service
      .from('questions')
      .select('id, difficulty_level, topic, passage, sentences, conclusion, hints')
      .eq('difficulty_level', level)
      .limit(10)

    if (!reviewQuestions?.length) {
      // C-7: Rollback consumed daily question since no question was served
      if (!isUnlimited) {
        await service.rpc('rollback_daily_question', { uid: user.id })
      }
      return NextResponse.json({ error: 'No questions available' }, { status: 404 })
    }

    pool = reviewQuestions
    isReview = true
  }

  // 선택: 첫 사용자는 첫 번째(가장 쉬운), 기존 사용자는 랜덤
  if (!pool || pool.length === 0) {
    // C-7: Rollback consumed daily question since no question was served
    if (!isUnlimited) {
      await service.rpc('rollback_daily_question', { uid: user.id })
    }
    return NextResponse.json({ error: '사용 가능한 문제가 없습니다.' }, { status: 404 })
  }
  const question = isFirstTime ? pool[0] : pool[Math.floor(Math.random() * pool.length)]

  return NextResponse.json({
    question,
    is_review: isReview,
    hint_points: currentHintPoints,
    daily_used: dailyUsed,
    daily_limit: isUnlimited ? null : FREE_DAILY_LIMIT,
    subscription_status: isUnlimited ? 'active' : profile.subscription_status,
    invite_code: profile.invite_code ?? null,
  })
}
