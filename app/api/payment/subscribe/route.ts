import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { chargeBillingKey, getPayment, PLANS, type PlanKey } from '@/lib/payment/portone'
import { sendEmail } from '@/lib/email/resend'
import { subscriptionConfirmEmail } from '@/lib/email/templates'
import * as Sentry from '@sentry/nextjs'
import { checkCsrf } from '@/lib/api/csrf'
import { rateLimit, rateLimitResponse } from '@/lib/api/rateLimit'
import { subscribeSchema } from '@/lib/api/schemas'

export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 5 payment requests per minute per user
  const { limited } = rateLimit(`subscribe:${user.id}`, { max: 5, windowMs: 60_000 })
  if (limited) return rateLimitResponse()

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = subscribeSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { billingKey, paymentId, plan } = parsed.data

  if (!PLANS[plan as PlanKey]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const validPlan = plan as PlanKey
  const planInfo = PLANS[validPlan]

  // 구독(빌링키) 플랜은 billingKey 필수, 일회성 플랜은 paymentId 필수
  if (planInfo.type === 'subscription' && !billingKey) {
    return NextResponse.json({ error: 'billingKey required for subscription' }, { status: 400 })
  }
  if (planInfo.type === 'onetime' && !paymentId) {
    return NextResponse.json({ error: 'paymentId required for onetime' }, { status: 400 })
  }

  const service = await createServiceClient()

  // 사용자 정보 조회
  const { data: profile } = await service
    .from('profiles')
    .select('nickname, current_level')
    .eq('id', user.id)
    .single()

  try {
    if (planInfo.type === 'subscription' && billingKey) {
      // ── 구독 플로우: 빌링키로 즉시 결제 ──
      const chargePaymentId = `payment_${user.id}_${Date.now()}`

      await chargeBillingKey({
        billingKey,
        paymentId: chargePaymentId,
        orderName: planInfo.name,
        amount: planInfo.amount,
        currency: 'KRW',
        customer: {
          id: user.id,
          name: profile?.nickname ?? '사용자',
          email: user.email,
        },
      })

      // 구독 정보 저장 (빌링키 포함)
      const expiresAt = new Date()
      if (validPlan === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else {
        expiresAt.setDate(expiresAt.getDate() + planInfo.days)
      }

      await service.from('subscriptions').upsert({
        user_id: user.id,
        plan: validPlan,
        billing_key: billingKey,
        customer_key: user.id,
        status: 'active',
        expires_at: expiresAt.toISOString(),
      })

      await service
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', user.id)

      // 이메일 발송
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

      return NextResponse.json({ success: true, plan: validPlan, expires_at: expiresAt, current_level: profile?.current_level ?? 1 })
    } else if (planInfo.type === 'onetime' && paymentId) {
      // ── 일회성 결제 플로우: 결제 상태 검증 ──
      const payment = await getPayment(paymentId)

      if (payment.status !== 'PAID') {
        return NextResponse.json({ error: '결제가 완료되지 않았습니다' }, { status: 402 })
      }

      if (payment.amount.total !== planInfo.amount) {
        return NextResponse.json({ error: '결제 금액이 일치하지 않습니다' }, { status: 402 })
      }

      // 결제 소유자 검증
      if (payment.customer?.id && payment.customer.id !== user.id) {
        return NextResponse.json({ error: '결제 정보가 일치하지 않습니다' }, { status: 403 })
      }

      // paymentId 중복 사용 방지
      const { data: existingPayment } = await service
        .from('subscriptions')
        .select('id')
        .eq('payment_id', paymentId)
        .maybeSingle()

      if (existingPayment) {
        return NextResponse.json({ error: 'Payment already redeemed' }, { status: 409 })
      }

      // 이용권 정보 저장 (빌링키 없음)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + planInfo.days)

      await service.from('subscriptions').upsert({
        user_id: user.id,
        plan: validPlan,
        billing_key: null,
        payment_id: paymentId,
        customer_key: user.id,
        status: 'active',
        expires_at: expiresAt.toISOString(),
      })

      await service
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', user.id)

      // 이메일 발송
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
        // 이메일 발송 실패해도 정상 처리
      }

      return NextResponse.json({ success: true, plan: validPlan, expires_at: expiresAt, current_level: profile?.current_level ?? 1 })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (err) {
    Sentry.captureException(err, { tags: { api: 'subscribe' } })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment failed' },
      { status: 402 },
    )
  }
}
