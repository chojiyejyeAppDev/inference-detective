import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getPayment, PLANS, type PlanKey } from '@/lib/payment/portone'

// PortOne V2 웹훅 body
interface PortOneWebhookBody {
  type: string
  timestamp: string
  data: {
    paymentId?: string
    transactionId?: string
    cancellationId?: string
  }
}

export async function POST(req: NextRequest) {
  let body: PortOneWebhookBody
  try {
    body = (await req.json()) as PortOneWebhookBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { type, data } = body
  const paymentId = data.paymentId

  if (!paymentId) {
    // paymentId 없는 이벤트는 무시
    return NextResponse.json({ received: true })
  }

  // PortOne API로 결제 상태 직접 확인 (위변조 방지)
  let paymentStatus: string
  try {
    const payment = await getPayment(paymentId)
    paymentStatus = payment.status
  } catch (err) {
    console.error('Payment validation failed:', err)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }

  // paymentId 형식: payment_{userId}_{timestamp}
  const userIdMatch = paymentId.match(/^payment_(.+)_\d+$/)
  if (!userIdMatch) {
    return NextResponse.json({ received: true })
  }
  const userId = userIdMatch[1]

  const service = await createServiceClient()

  switch (type) {
    case 'Transaction.Paid': {
      if (paymentStatus !== 'PAID') break

      // 구독 정보에서 플랜 조회 → days 기반 만료일 계산
      const { data: sub } = await service
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId)
        .single()

      const plan = (sub?.plan as PlanKey) ?? 'monthly'
      const days = PLANS[plan]?.days ?? 30

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days)

      await service
        .from('subscriptions')
        .update({ status: 'active', expires_at: expiresAt.toISOString() })
        .eq('user_id', userId)

      await service
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', userId)
      break
    }

    case 'Transaction.Cancelled': {
      if (paymentStatus !== 'CANCELLED') break

      await service
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', userId)

      await service
        .from('profiles')
        .update({ subscription_status: 'cancelled' })
        .eq('id', userId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
