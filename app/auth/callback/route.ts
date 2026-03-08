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
      try {
        const { data: { user } } = await supabase.auth.getUser()
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

      // 초대 코드가 있으면 redeem
      if (ref) {
        try {
          await fetch(`${origin}/api/invite/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invite_code: ref }),
          })
        } catch {
          // 실패해도 로그인은 계속 진행
        }
      }

      // 닉네임 미설정 시 설정 페이지로, 아니면 레벨로
      if (needsNickname) {
        return NextResponse.redirect(`${origin}/settings?setup_nickname=true`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
