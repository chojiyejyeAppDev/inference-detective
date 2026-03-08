import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { welcomeEmail } from '@/lib/email/templates'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const ref = searchParams.get('ref')
  const next = searchParams.get('next') ?? '/levels'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 환영 이메일 발송 (최초 인증 시)
      let needsNickname = false
      const { data: { user } } = await supabase.auth.getUser()
      try {
        if (user?.email) {
          const service = await createServiceClient()
          const { data: profile } = await service
            .from('profiles')
            .select('nickname, welcome_email_sent')
            .eq('id', user.id)
            .single()

          if (profile && !profile.welcome_email_sent) {
            const { subject, html } = welcomeEmail(profile.nickname || '학습자')
            await sendEmail({ to: user.email, subject, html })
            await service
              .from('profiles')
              .update({ welcome_email_sent: true })
              .eq('id', user.id)
          }

          // Google OAuth 사용자의 닉네임 미설정 감지
          if (profile && !profile.nickname) {
            needsNickname = true
          }
        }
      } catch {
        // 이메일 발송 실패해도 로그인은 계속 진행
      }

      // 초대 코드가 있으면 서버사이드에서 직접 redeem (fetch는 쿠키 미전달로 401 발생)
      if (ref && user) {
        try {
          const service = await createServiceClient()
          const { data: invitation } = await service
            .from('invitations')
            .select('inviter_id, redeemed')
            .eq('code', ref.trim())
            .maybeSingle()

          if (invitation && !invitation.redeemed && invitation.inviter_id !== user.id) {
            // 초대 사용 처리
            await service
              .from('invitations')
              .update({ redeemed: true, redeemed_by: user.id, redeemed_at: new Date().toISOString() })
              .eq('code', ref.trim())

            // 초대자 보너스 (힌트 포인트 또는 일일 문제)
            const { data: inviterProfile } = await service
              .from('profiles')
              .select('subscription_status, daily_questions_used')
              .eq('id', invitation.inviter_id)
              .single()

            if (inviterProfile?.subscription_status === 'active') {
              await service.rpc('add_hint_points', { uid: invitation.inviter_id, amount: 5 })
            } else if (inviterProfile) {
              await service
                .from('profiles')
                .update({ daily_questions_used: Math.max(0, inviterProfile.daily_questions_used - 2) })
                .eq('id', invitation.inviter_id)
            }

            // 본인 보너스 (일일 문제 +2)
            const { data: myProfile } = await service
              .from('profiles')
              .select('daily_questions_used')
              .eq('id', user.id)
              .single()

            if (myProfile) {
              await service
                .from('profiles')
                .update({ daily_questions_used: Math.max(0, myProfile.daily_questions_used - 2) })
                .eq('id', user.id)
            }
          }
        } catch {
          // 실패해도 로그인은 계속 진행
        }
      }

      // 닉네임 미설정 시 레벨 페이지에서 닉네임 설정 모달 표시
      if (needsNickname) {
        return NextResponse.redirect(`${origin}/levels?setup_nickname=true`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
