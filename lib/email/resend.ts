import { Resend } from 'resend'

// 지연 초기화 — CI 빌드 시 API 키 없어도 에러 방지
let resend: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Resend] RESEND_API_KEY not set, skipping email')
    return null
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// 발신 주소 — Resend 도메인 인증 후 변경 가능
const FROM_EMAIL = '이:르다 <eonlab@2onlab.com>'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const client = getResend()
  if (!client) {
    return { success: false, error: 'Resend not configured' }
  }

  try {
    const { data, error } = await client.emails.send({
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
