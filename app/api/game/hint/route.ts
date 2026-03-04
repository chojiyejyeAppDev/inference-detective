import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { question_id, hint_level } = await req.json() as {
    question_id: string
    hint_level: number
  }

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
  const hint = hints?.find((h) => h.level <= hint_level) ?? hints?.[0]

  if (!hint) return NextResponse.json({ error: 'Hint not found' }, { status: 404 })

  // 힌트 포인트 차감 (최소 0)
  const cost = profile.subscription_status === 'active' ? 1 : 2
  if (profile.hint_points < cost) {
    return NextResponse.json(
      { error: 'insufficient_hint_points', hint_points: profile.hint_points },
      { status: 402 },
    )
  }

  await service
    .from('profiles')
    .update({ hint_points: profile.hint_points - cost })
    .eq('id', user.id)

  return NextResponse.json({
    hint: hint.text,
    hint_points_remaining: profile.hint_points - cost,
  })
}
