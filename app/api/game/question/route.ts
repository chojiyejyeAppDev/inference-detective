import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { FREE_DAILY_LIMIT } from '@/lib/game/levelConfig'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()
  // KST(UTC+9) 기준 오늘 날짜
  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const today = new Date(now.getTime() + kstOffset).toISOString().split('T')[0]

  // 프로필 조회 및 일일 제한 체크
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // 날짜 리셋 처리
  if (profile.daily_reset_at !== today) {
    await service
      .from('profiles')
      .update({ daily_questions_used: 0, daily_reset_at: today })
      .eq('id', user.id)
    profile.daily_questions_used = 0
    profile.daily_reset_at = today
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

  // 관리자는 모든 제한 면제
  const isAdmin = profile.role === 'admin'

  // 무료 사용자 일일 제한 (관리자 제외)
  if (
    !isAdmin &&
    profile.subscription_status !== 'active' &&
    profile.daily_questions_used >= FREE_DAILY_LIMIT
  ) {
    return NextResponse.json(
      {
        error: 'daily_limit_reached',
        used: profile.daily_questions_used,
        limit: FREE_DAILY_LIMIT,
      },
      { status: 403 },
    )
  }

  const { searchParams } = new URL(req.url)
  const questionId = searchParams.get('id')
  const level = parseInt(searchParams.get('level') ?? String(profile.current_level))

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

    return NextResponse.json({
      question: specificQuestion,
      daily_used: profile.daily_questions_used,
      daily_limit: isAdmin || profile.subscription_status === 'active' ? null : FREE_DAILY_LIMIT,
      subscription_status: isAdmin ? 'active' : profile.subscription_status,
    })
  }

  // 이미 푼 문제 제외
  const { data: solved } = await service
    .from('user_progress')
    .select('question_id')
    .eq('user_id', user.id)
    .eq('is_correct', true)

  const solvedIds = solved?.map((s) => s.question_id) ?? []

  // UUID 형식 검증 (SQL 인젝션 방지)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const safeIds = solvedIds.filter((id) => typeof id === 'string' && UUID_RE.test(id))

  // 문제 조회
  let query = service
    .from('questions')
    .select('id, difficulty_level, topic, passage, sentences, conclusion, hints')
    .eq('difficulty_level', level)

  if (safeIds.length > 0) {
    query = query.not('id', 'in', `(${safeIds.join(',')})`)
  }

  const { data: questions, error: qError } = await query.limit(10)

  if (qError || !questions?.length) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 })
  }

  // 랜덤 선택
  const question = questions[Math.floor(Math.random() * questions.length)]

  return NextResponse.json({
    question,
    daily_used: profile.daily_questions_used,
    daily_limit: isAdmin || profile.subscription_status === 'active' ? null : FREE_DAILY_LIMIT,
    subscription_status: isAdmin ? 'active' : profile.subscription_status,
  })
}
