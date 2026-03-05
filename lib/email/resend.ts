import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// 발신 주소 — Resend 도메인 인증 후 변경 가능
const FROM_EMAIL = 'iruda <onboarding@resend.dev>'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('[Resend] Email send error:', error)
      return { success: false, error }
    }

    console.log('[Resend] Email sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[Resend] Unexpected error:', err)
    return { success: false, error: err }
  }
}
