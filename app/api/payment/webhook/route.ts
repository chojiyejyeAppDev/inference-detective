import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Toss Payments Webhook 시그니처 검증
  const secret = process.env.TOSS_WEBHOOK_SECRET
  const signature = req.headers.get('TossPayments-Signature')

  if (secret && !signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const body = await req.json()
  const { eventType, data } = body as {
    eventType: string
    data: {
      paymentKey?: string
      billingKey?: string
      status?: string
      customerKey?: string
    }
  }

  const service = await createServiceClient()

  switch (eventType) {
    case 'PAYMENT_STATUS_CHANGED': {
      if (data.status === 'DONE' && data.customerKey) {
        // 결제 성공 → 구독 갱신
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1)

        await service
          .from('subscriptions')
          .update({ status: 'active', expires_at: expiresAt.toISOString() })
          .eq('toss_customer_key', data.customerKey)

        // 프로필 구독 상태도 갱신
        const { data: sub } = await service
          .from('subscriptions')
          .select('user_id')
          .eq('toss_customer_key', data.customerKey)
          .single()

        if (sub) {
          await service
            .from('profiles')
            .update({
              subscription_status: 'active',
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq('id', sub.user_id)
        }
      }

      if (data.status === 'CANCELED' && data.customerKey) {
        await service
          .from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('toss_customer_key', data.customerKey)

        const { data: sub } = await service
          .from('subscriptions')
          .select('user_id')
          .eq('toss_customer_key', data.customerKey)
          .single()

        if (sub) {
          await service
            .from('profiles')
            .update({ subscription_status: 'cancelled' })
            .eq('id', sub.user_id)
        }
      }
      break
    }

    case 'BILLING_KEY_STATUS_CHANGED': {
      if (data.status === 'CANCELED' && data.customerKey) {
        await service
          .from('subscriptions')
          .update({ status: 'cancelled', toss_billing_key: null })
          .eq('toss_customer_key', data.customerKey)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
