import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { INVITE_BONUS_QUESTIONS } from '@/lib/game/levelConfig'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { invite_code } = await req.json() as { invite_code: string }
  const service = await createServiceClient()

  // 이미 초대 코드 사용 여부 체크
  const { data: existingInvite } = await service
    .from('invitations')
    .select('id')
    .eq('invitee_id', user.id)
    .single()

  if (existingInvite) {
    return NextResponse.json({ error: 'Already used an invite code' }, { status: 400 })
  }

  // 초대자 찾기
  const { data: inviter } = await service
    .from('profiles')
    .select('id, daily_questions_used')
    .eq('invite_code', invite_code.toUpperCase())
    .single()

  if (!inviter) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  if (inviter.id === user.id) {
    return NextResponse.json({ error: 'Cannot use own invite code' }, { status: 400 })
  }

  // 초대 기록 생성
  await service.from('invitations').insert({
    inviter_id: inviter.id,
    invitee_id: user.id,
    bonus_granted: true,
  })

  // 초대자 보너스: 일일 한도에서 차감 (음수 허용으로 추가 문제 효과)
  await service
    .from('profiles')
    .update({
      daily_questions_used: Math.max(0, inviter.daily_questions_used - INVITE_BONUS_QUESTIONS),
    })
    .eq('id', inviter.id)

  // 신규 가입자 보너스
  const { data: myProfile } = await service
    .from('profiles')
    .select('daily_questions_used')
    .eq('id', user.id)
    .single()

  await service
    .from('profiles')
    .update({
      daily_questions_used: Math.max(0, (myProfile?.daily_questions_used ?? 0) - INVITE_BONUS_QUESTIONS),
      invited_by: inviter.id,
    })
    .eq('id', user.id)

  return NextResponse.json({
    success: true,
    bonus_questions: INVITE_BONUS_QUESTIONS,
    message: `초대 코드 적용 완료! 오늘 ${INVITE_BONUS_QUESTIONS}문제가 추가되었어요.`,
  })
}
