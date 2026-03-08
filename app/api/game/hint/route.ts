import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkCsrf } from '@/lib/api/csrf'
import { rateLimit, rateLimitResponse } from '@/lib/api/rateLimit'

export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 30 hint requests per minute per user
  const { limited } = rateLimit(`hint:${user.id}`, { max: 30, windowMs: 60_000 })
  if (limited) return rateLimitResponse()

  let body: { question_id: string; hint_step: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { question_id, hint_step } = body

  // 입력 검증
  if (!question_id || typeof question_id !== 'string') {
    return NextResponse.json({ error: 'Invalid question_id' }, { status: 400 })
  }
  const step = Math.max(1, Math.min(10, Math.floor(Number(hint_step) || 1)))

  const service = await createServiceClient()

  // 힌트 포인트 확인
  const { data: profile } = await service
    .from('profiles')
    .select('hint_points, subscription_status')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // 무료 사용자는 직접 힌트만 사용 가능
  const { data: question } = await service
    .from('questions')
    .select('hints, difficulty_level')
    .eq('id', question_id)
    .single()

  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  // 레벨 7 (힌트 없음) 또는 유료 전용 힌트 레벨 체크
  if (question.difficulty_level === 7) {
    return NextResponse.json({ error: 'No hints available at this level' }, { status: 403 })
  }

  const hints = question.hints as Array<{ level: number; text: string }>
  if (!hints || hints.length === 0) {
    return NextResponse.json({ error: 'no_more_hints' }, { status: 404 })
  }

  // 힌트를 level 순서대로 정렬 후 step 번째 힌트 반환
  const sorted = [...hints].sort((a, b) => a.level - b.level)
  if (step > sorted.length) {
    return NextResponse.json({ error: 'no_more_hints' }, { status: 404 })
  }
  const hint = sorted[step - 1]

  // 힌트 포인트 원자적 차감 (race condition 방지)
  const cost = profile.subscription_status === 'active' ? 1 : 2
  const { data: remaining, error: deductError } = await service.rpc('deduct_hint_points', {
    uid: user.id,
    cost_param: cost,
  })

  if (deductError || remaining === -1) {
    return NextResponse.json(
      { error: 'insufficient_hint_points', hint_points: profile.hint_points },
      { status: 402 },
    )
  }

  return NextResponse.json({
    hint: hint.text,
    hint_points_remaining: remaining,
  })
}
