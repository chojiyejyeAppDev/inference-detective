/**
 * 레벨 스킵 진단 테스트 API
 *
 * GET  — 진단 문제 3개 반환 (target_level 파라미터)
 * POST — 진단 결과 제출 → 레벨 스킵 판정
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { evaluateChain } from '@/lib/game/evaluator'
import { rateLimit, rateLimitResponse } from '@/lib/api/rateLimit'
import { checkCsrf } from '@/lib/api/csrf'

const DIAGNOSTIC_QUESTIONS = 3
const PASS_THRESHOLD = 2 // 3개 중 2개 이상 정답

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { limited } = rateLimit(`diagnostic:${user.id}`, { max: 5, windowMs: 60_000 })
  if (limited) return rateLimitResponse()

  const { searchParams } = new URL(req.url)
  const targetLevel = parseInt(searchParams.get('target_level') ?? '0')

  if (targetLevel < 2 || targetLevel > 7) {
    return NextResponse.json({ error: 'target_level must be 2-7' }, { status: 400 })
  }

  const service = await createServiceClient()

  // 현재 레벨 확인 — 이미 해당 레벨 이상이면 불필요
  const { data: profile } = await service
    .from('profiles')
    .select('current_level')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.current_level >= targetLevel) {
    return NextResponse.json({ error: 'Already at or above target level' }, { status: 400 })
  }

  // 최대 2레벨까지만 스킵 허용
  if (targetLevel - profile.current_level > 2) {
    return NextResponse.json({ error: 'Can only skip up to 2 levels ahead' }, { status: 400 })
  }

  // 해당 레벨 문제 3개 랜덤 추출
  const { data: questions, error: qError } = await service
    .from('questions')
    .select('id, difficulty_level, topic, passage, sentences, conclusion, hints')
    .eq('difficulty_level', targetLevel)
    .limit(20)

  if (qError || !questions || questions.length < DIAGNOSTIC_QUESTIONS) {
    return NextResponse.json({ error: 'Not enough questions for diagnostic' }, { status: 404 })
  }

  // 랜덤 3개 선택
  const shuffled = questions.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, DIAGNOSTIC_QUESTIONS)

  return NextResponse.json({
    target_level: targetLevel,
    current_level: profile.current_level,
    questions: selected,
    pass_threshold: PASS_THRESHOLD,
    total: DIAGNOSTIC_QUESTIONS,
  })
}

export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { limited } = rateLimit(`diagnostic-submit:${user.id}`, { max: 3, windowMs: 300_000 })
  if (limited) return rateLimitResponse()

  let body: { target_level: number; results: Array<{ question_id: string; submitted_chain: string[] }> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { target_level, results } = body
  if (!target_level || !Array.isArray(results) || results.length !== DIAGNOSTIC_QUESTIONS) {
    return NextResponse.json({ error: `Must submit exactly ${DIAGNOSTIC_QUESTIONS} results` }, { status: 400 })
  }

  if (target_level < 2 || target_level > 7) {
    return NextResponse.json({ error: 'Invalid target_level' }, { status: 400 })
  }

  const service = await createServiceClient()

  // 현재 레벨 확인
  const { data: profile } = await service
    .from('profiles')
    .select('current_level')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.current_level >= target_level) {
    return NextResponse.json({ error: 'Already at or above target level' }, { status: 400 })
  }

  if (target_level - profile.current_level > 2) {
    return NextResponse.json({ error: 'Can only skip up to 2 levels ahead' }, { status: 400 })
  }

  // 각 문제 평가
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  let correctCount = 0
  const evaluations: Array<{ question_id: string; is_correct: boolean; accuracy: number }> = []

  for (const r of results) {
    if (!r.question_id || !UUID_RE.test(r.question_id) || !Array.isArray(r.submitted_chain)) {
      return NextResponse.json({ error: 'Invalid result format' }, { status: 400 })
    }

    const { data: question } = await service
      .from('questions')
      .select('*')
      .eq('id', r.question_id)
      .single()

    if (!question) {
      return NextResponse.json({ error: `Question ${r.question_id} not found` }, { status: 404 })
    }

    const evaluation = evaluateChain(question, r.submitted_chain)
    if (evaluation.is_correct) correctCount++

    evaluations.push({
      question_id: r.question_id,
      is_correct: evaluation.is_correct,
      accuracy: evaluation.accuracy,
    })
  }

  const passed = correctCount >= PASS_THRESHOLD

  // 통과 시 레벨 업데이트
  if (passed) {
    await service
      .from('profiles')
      .update({ current_level: target_level })
      .eq('id', user.id)
  }

  return NextResponse.json({
    passed,
    correct_count: correctCount,
    total: DIAGNOSTIC_QUESTIONS,
    threshold: PASS_THRESHOLD,
    new_level: passed ? target_level : profile.current_level,
    evaluations,
  })
}
