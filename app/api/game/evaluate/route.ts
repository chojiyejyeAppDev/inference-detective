import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { evaluateChain, checkLevelUp } from '@/lib/game/evaluator'
import { LEVEL_UP_SESSIONS } from '@/lib/game/levelConfig'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { question_id, submitted_chain, hints_used = 0 } = body as {
    question_id: string
    submitted_chain: (string | null)[]
    hints_used: number
  }

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

  // 일일 사용 횟수 증가
  await service
    .from('profiles')
    .update({ daily_questions_used: profile.daily_questions_used + 1 })
    .eq('id', user.id)

  // 레벨업 체크
  let levelUp = false
  if (evaluation.is_correct && profile.current_level === question.difficulty_level) {
    const { data: sessions } = await service
      .from('level_sessions')
      .select('accuracy')
      .eq('user_id', user.id)
      .eq('level', profile.current_level)
      .order('created_at', { ascending: false })
      .limit(LEVEL_UP_SESSIONS)

    const accuracies = sessions?.map((s) => Number(s.accuracy)) ?? []
    levelUp = checkLevelUp(accuracies) && profile.current_level < 7

    if (levelUp) {
      await service
        .from('profiles')
        .update({ current_level: profile.current_level + 1 })
        .eq('id', user.id)
    }
  }

  return NextResponse.json({ ...evaluation, level_up: levelUp })
}
