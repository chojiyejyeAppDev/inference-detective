import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const secret = process.env.TOSS_WEBHOOK_SECRET
  const signature = req.headers.get('TossPayments-Signature')

  // Raw body를 텍스트로 읽어야 서명 검증이 정확함
  const rawBody = await req.text()

  // HMAC-SHA256 서명 검증
  if (secret) {
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    try {
      const expectedHex = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')

      // Base64 인코딩된 서명도 지원 (Toss가 hex/base64 혼용 가능)
      const sigIsHex = /^[0-9a-f]+$/i.test(signature)
      const expectedSig = sigIsHex
        ? expectedHex
        : Buffer.from(expectedHex, 'hex').toString('base64')

      const sigBuf = Buffer.from(signature)
      const expBuf = Buffer.from(sigIsHex ? expectedHex : expectedSig)

      if (
        sigBuf.length !== expBuf.length ||
        !timingSafeEqual(sigBuf, expBuf)
      ) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }
  }

  let body: { eventType: string; data: { paymentKey?: string; billingKey?: string; status?: string; customerKey?: string } }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { eventType, data } = body
  const service = await createServiceClient()

  switch (eventType) {
    case 'PAYMENT_STATUS_CHANGED': {
      if (data.status === 'DONE' && data.customerKey) {
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1)

        await service
          .from('subscriptions')
          .update({ status: 'active', expires_at: expiresAt.toISOString() })
          .eq('toss_customer_key', data.customerKey)

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
