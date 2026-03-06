import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { deleteBillingKey } from '@/lib/payment/portone'

export async function POST() {
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
      console.error('Billing key deletion failed:', err)
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

  return NextResponse.json({
    message: isSubscription
      ? '구독이 취소되었어요. 만료일까지 서비스를 이용할 수 있어요.'
      : '이용권이 취소되었어요. 만료일까지 서비스를 이용할 수 있어요.',
    expires_at: subscription.expires_at,
  })
}
