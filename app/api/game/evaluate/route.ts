import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { evaluateChain, checkLevelUp } from '@/lib/game/evaluator'
import { LEVEL_UP_SESSIONS, LEVEL_UP_ACCURACY, CORRECT_ANSWER_HINT_BONUS, MAX_HINT_POINTS } from '@/lib/game/levelConfig'
import { checkCsrf } from '@/lib/api/csrf'
import { rateLimit, rateLimitResponse } from '@/lib/api/rateLimit'
import { evaluateSchema } from '@/lib/api/schemas'

export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 20 evaluations per minute per user
  const { limited } = rateLimit(`evaluate:${user.id}`, { max: 20, windowMs: 60_000 })
  if (limited) return rateLimitResponse()

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = evaluateSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { question_id, submitted_chain, hints_used } = parsed.data

  const service = await createServiceClient()

  // 문제 조회 (correct_chain 포함)
  const { data: question, error: qError } = await service
    .from('questions')
    .select('*')
    .eq('id', question_id)
    .single()

  if (qError || !question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  // 중복 제출 방지: 같은 문제를 이미 제출한 경우
  const { data: existingSubmission } = await service
    .from('user_progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('question_id', question_id)
    .limit(1)
    .maybeSingle()

  if (existingSubmission) {
    return NextResponse.json({ error: 'Already submitted this question' }, { status: 409 })
  }

  // 평가
  const evaluation = evaluateChain(question, submitted_chain)

  // 프로필 조회
  const { data: profile } = await service
    .from('profiles')
    .select('current_level, daily_questions_used, subscription_status')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // 진행 기록 저장
  await service.from('user_progress').insert({
    user_id: user.id,
    question_id,
    submitted_chain,
    is_correct: evaluation.is_correct,
    hints_used,
  })

  // 레벨 세션 기록
  await service.from('level_sessions').insert({
    user_id: user.id,
    level: question.difficulty_level,
    accuracy: evaluation.accuracy,
  })

  // 일일 사용 횟수는 question API에서 원자적으로 처리됨 (check_and_consume_daily_question RPC)

  // 레벨업 체크 + 진행 상황
  let levelUp = false
  const { data: recentSessions } = await service
    .from('level_sessions')
    .select('accuracy')
    .eq('user_id', user.id)
    .eq('level', question.difficulty_level)
    .order('created_at', { ascending: false })
    .limit(LEVEL_UP_SESSIONS)

  const accuracies = recentSessions?.map((s) => Number(s.accuracy)) ?? []
  const qualifiedSessions = accuracies.filter((a) => a >= LEVEL_UP_ACCURACY).length

  if (evaluation.is_correct && profile.current_level === question.difficulty_level) {
    levelUp = checkLevelUp(accuracies) && profile.current_level < 7

    if (levelUp) {
      await service
        .from('profiles')
        .update({ current_level: profile.current_level + 1 })
        .eq('id', user.id)
    }
  }

  // 정답 시 힌트 포인트 보너스
  let hintPointsBonus = 0
  let hintPointsRemaining: number | null = null
  if (evaluation.is_correct) {
    const { data: newPoints } = await service.rpc('add_hint_points', {
      uid: user.id,
      amount: CORRECT_ANSWER_HINT_BONUS,
      max_points: MAX_HINT_POINTS,
    })
    if (newPoints != null && newPoints >= 0) {
      hintPointsBonus = CORRECT_ANSWER_HINT_BONUS
      hintPointsRemaining = newPoints
    }
  }

  // 연속 정답 스트릭 계산
  let streak = 0
  if (evaluation.is_correct) {
    const { data: recentProgress } = await service
      .from('user_progress')
      .select('is_correct')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    streak = 1 // 현재 정답 포함
    for (const p of recentProgress?.slice(1) ?? []) {
      if (p.is_correct) streak++
      else break
    }
  }

  return NextResponse.json({
    ...evaluation,
    correct_chain: question.correct_chain,
    level_up: levelUp,
    streak,
    hint_points_bonus: hintPointsBonus,
    hint_points_remaining: hintPointsRemaining,
    level_progress: {
      qualified: Math.min(qualifiedSessions, LEVEL_UP_SESSIONS),
      required: LEVEL_UP_SESSIONS,
    },
  })
}
