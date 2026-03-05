import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { INVITE_BONUS_QUESTIONS } from '@/lib/game/levelConfig'
import { sendEmail } from '@/lib/email/resend'
import { inviteSuccessToInviter, inviteSuccessToInvitee } from '@/lib/email/templates'

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

  // 이메일 알림 발송 (비동기, 실패해도 응답에 영향 없음)
  try {
    // 초대자 이메일 조회
    const { data: inviterAuth } = await service.auth.admin.getUserById(inviter.id)
    const { data: inviterProfile } = await service
      .from('profiles')
      .select('nickname')
      .eq('id', inviter.id)
      .single()

    const { data: inviteeProfile } = await service
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .single()

    const inviterNickname = inviterProfile?.nickname || '사용자'
    const inviteeNickname = inviteeProfile?.nickname || '신규 사용자'

    // 초대자에게 알림
    if (inviterAuth?.user?.email) {
      const mail = inviteSuccessToInviter(inviterNickname, inviteeNickname, INVITE_BONUS_QUESTIONS)
      await sendEmail({ to: inviterAuth.user.email, ...mail })
    }

    // 가입자에게 보너스 알림
    if (user.email) {
      const mail = inviteSuccessToInvitee(inviteeNickname, INVITE_BONUS_QUESTIONS)
      await sendEmail({ to: user.email, ...mail })
    }
  } catch {
    // 이메일 발송 실패해도 초대 기능은 정상 동작
  }

  return NextResponse.json({
    success: true,
    bonus_questions: INVITE_BONUS_QUESTIONS,
    message: `초대 코드 적용 완료! 오늘 ${INVITE_BONUS_QUESTIONS}문제가 추가되었어요.`,
  })
}
