import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { chargeBillingKey, PLANS, type PlanKey } from '@/lib/payment/portone'
import { sendEmail } from '@/lib/email/resend'
import { subscriptionConfirmEmail } from '@/lib/email/templates'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { billingKey, plan } = await req.json() as {
    billingKey: string
    plan: PlanKey
  }

  if (!billingKey || !PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = await createServiceClient()

  // 사용자 정보 조회
  const { data: profile } = await service
    .from('profiles')
    .select('nickname')
    .eq('id', user.id)
    .single()

  try {
    // 1. 빌링키로 즉시 결제
    const planInfo = PLANS[plan]
    const paymentId = `payment_${user.id}_${Date.now()}`

    await chargeBillingKey({
      billingKey,
      paymentId,
      orderName: planInfo.name,
      amount: planInfo.amount,
      currency: 'KRW',
      customer: {
        id: user.id,
        name: profile?.nickname ?? '사용자',
        email: user.email,
      },
    })

    // 2. 구독 정보 저장
    const expiresAt = new Date()
    if (plan === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    await service.from('subscriptions').upsert({
      user_id: user.id,
      plan,
      billing_key: billingKey,
      customer_key: user.id,
      status: 'active',
      expires_at: expiresAt.toISOString(),
    })

    // 3. 프로필 구독 상태 업데이트
    await service
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)

    // 구독 완료 이메일 발송
    try {
      if (user.email) {
        const mail = subscriptionConfirmEmail(
          profile?.nickname || '사용자',
          planInfo.name,
          expiresAt.toISOString(),
        )
        await sendEmail({ to: user.email, ...mail })
      }
    } catch {
      // 이메일 발송 실패해도 구독은 정상 처리
    }

    return NextResponse.json({ success: true, plan, expires_at: expiresAt })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment failed' },
      { status: 402 },
    )
  }
}
