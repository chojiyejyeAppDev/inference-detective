import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { issueBillingKey, chargeBilling, PLANS, PlanKey } from '@/lib/payment/toss'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { authKey, customerKey, plan } = await req.json() as {
    authKey: string
    customerKey: string
    plan: PlanKey
  }

  if (!PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const service = await createServiceClient()

  // 사용자 정보 조회
  const { data: profile } = await service
    .from('profiles')
    .select('nickname')
    .eq('id', user.id)
    .single()

  try {
    // 1. Billing Key 발급
    const { billingKey } = await issueBillingKey(authKey, customerKey)

    // 2. 첫 결제 실행
    const planInfo = PLANS[plan]
    const orderId = `order_${user.id}_${Date.now()}`

    await chargeBilling({
      billingKey,
      customerKey,
      orderId,
      orderName: planInfo.name,
      amount: planInfo.amount,
      customerEmail: user.email ?? '',
      customerName: profile?.nickname ?? '사용자',
    })

    // 3. 구독 정보 저장
    const expiresAt = new Date()
    if (plan === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    await service.from('subscriptions').upsert({
      user_id: user.id,
      plan,
      toss_billing_key: billingKey,
      toss_customer_key: customerKey,
      status: 'active',
      expires_at: expiresAt.toISOString(),
    })

    // 4. 프로필 구독 상태 업데이트
    await service
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.json({ success: true, plan, expires_at: expiresAt })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment failed' },
      { status: 402 },
    )
  }
}
