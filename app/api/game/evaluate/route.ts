import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { evaluateChain, checkLevelUp } from '@/lib/game/evaluator'
import { LEVEL_UP_SESSIONS, LEVEL_UP_ACCURACY } from '@/lib/game/levelConfig'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { question_id, submitted_chain, hints_used: rawHintsUsed = 0 } = body as {
    question_id: string
    submitted_chain: (string | null)[]
    hints_used: number
  }

  // 입력 검증
  if (!question_id || typeof question_id !== 'string') {
    return NextResponse.json({ error: 'Invalid question_id' }, { status: 400 })
  }
  if (!Array.isArray(submitted_chain) || submitted_chain.length > 10) {
    return NextResponse.json({ error: 'Invalid submitted_chain' }, { status: 400 })
  }
  if (submitted_chain.some((v) => v !== null && typeof v !== 'string')) {
    return NextResponse.json({ error: 'Invalid chain entries' }, { status: 400 })
  }
  const hints_used = Math.max(0, Math.min(10, Number(rawHintsUsed) || 0))

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

  // 일일 사용 횟수 원자적 증가
  await service.rpc('increment_daily_questions', { user_id_param: user.id })

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
    level_up: levelUp,
    streak,
    level_progress: {
      qualified: Math.min(qualifiedSessions, LEVEL_UP_SESSIONS),
      required: LEVEL_UP_SESSIONS,
    },
  })
}
