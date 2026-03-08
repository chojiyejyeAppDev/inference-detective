import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'
import { deleteBillingKey } from '@/lib/payment/portone'
import { checkCsrf } from '@/lib/api/csrf'
import { sendEmail } from '@/lib/email/resend'
import { subscriptionCancelledEmail } from '@/lib/email/templates'

export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req)
  if (csrfError) return csrfError
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()

  const { data: subscription } = await service
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!subscription) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
  }

  const isSubscription = !!subscription.billing_key

  // 구독 플랜: PortOne에서 빌링키 비활성화
  if (isSubscription) {
    try {
      await deleteBillingKey(subscription.billing_key)
    } catch (err) {
      // 빌링키 삭제 실패해도 DB 취소는 진행
      Sentry.captureException(err, { tags: { api: 'cancel' } })
    }
  }

  // DB 구독 상태 업데이트
  await service
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      ...(isSubscription ? { billing_key: null } : {}),
    })
    .eq('id', subscription.id)

  // 프로필의 subscription_status는 만료일 이후 처리
  // 만료일까지 서비스 제공

  // 해지 안내 이메일 발송 (비동기, 실패해도 응답에 영향 없음)
  const { data: profile } = await service
    .from('profiles')
    .select('nickname')
    .eq('id', user.id)
    .single()

  if (profile?.nickname && user.email && subscription.expires_at) {
    const email = subscriptionCancelledEmail(profile.nickname, subscription.expires_at)
    sendEmail({ to: user.email, ...email }).catch((err) => {
      Sentry.captureException(err, { tags: { api: 'cancel-email' } })
    })
  }

  return NextResponse.json({
    message: isSubscription
      ? '구독이 취소되었어요. 만료일까지 서비스를 이용할 수 있어요.'
      : '이용권이 취소되었어요. 만료일까지 서비스를 이용할 수 있어요.',
    expires_at: subscription.expires_at,
  })
}
