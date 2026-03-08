import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getPayment, PLANS, type PlanKey } from '@/lib/payment/portone'
import * as Sentry from '@sentry/nextjs'
import crypto from 'crypto'

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

/**
 * PortOne V2 webhook signature 검증
 * 헤더: webhook-id, webhook-signature, webhook-timestamp
 * signature = base64(HMAC-SHA256(secret, "{webhook-id}.{webhook-timestamp}.{body}"))
 */
function verifyWebhookSignature(
  body: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  webhookSignature: string | null,
): boolean {
  const secret = process.env.PORTONE_WEBHOOK_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') return false
    return true // 개발 환경에서만 검증 스킵
  }
  if (!webhookId || !webhookTimestamp || !webhookSignature) return false

  // timestamp가 5분 이상 오래된 경우 거부
  const ts = parseInt(webhookTimestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const signedContent = `${webhookId}.${webhookTimestamp}.${body}`
  // secret이 "whsec_" prefix를 가질 수 있음
  const secretBytes = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64')
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64')

  // signature 헤더에 여러 시그니처가 포함될 수 있음 (v1,xxxx 형식)
  const signatures = webhookSignature.split(' ')
  return signatures.some((sig) => {
    const [, sigValue] = sig.split(',')
    if (!sigValue) return false
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(sigValue),
      )
    } catch {
      return false
    }
  })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Webhook signature 검증
  const webhookId = req.headers.get('webhook-id')
  const webhookTimestamp = req.headers.get('webhook-timestamp')
  const webhookSignature = req.headers.get('webhook-signature')

  if (!verifyWebhookSignature(rawBody, webhookId, webhookTimestamp, webhookSignature)) {
    Sentry.captureMessage('Webhook signature verification failed', 'warning')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: PortOneWebhookBody
  try {
    body = JSON.parse(rawBody) as PortOneWebhookBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { type, data } = body
  const paymentId = data.paymentId

  if (!paymentId) {
    // paymentId 없는 이벤트는 무시
    return NextResponse.json({ received: true })
  }

  // paymentId 형식: payment_{userId}_{timestamp}
  const userIdMatch = paymentId.match(/^payment_(.+)_\d+$/)
  if (!userIdMatch) {
    return NextResponse.json({ received: true })
  }
  const userId = userIdMatch[1]

  // PortOne API로 결제 상태 직접 확인 (위변조 방지)
  let paymentStatus: string
  try {
    const payment = await getPayment(paymentId)
    paymentStatus = payment.status

    // 결제 소유자 검증: paymentId에서 추출한 userId와 실제 결제의 customerId 일치 확인
    if (payment.customer?.id && payment.customer.id !== userId) {
      Sentry.captureMessage('Webhook userId mismatch', { level: 'warning', extra: { paymentUserId: userId, customerId: payment.customer.id } })
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 })
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { api: 'webhook' } })
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }

  const service = await createServiceClient()

  switch (type) {
    case 'Transaction.Paid': {
      if (paymentStatus !== 'PAID') break

      // 멱등성: 이미 처리된 paymentId인지 확인
      const { data: existingSub } = await service
        .from('subscriptions')
        .select('payment_id, status, plan')
        .eq('user_id', userId)
        .single()

      if (existingSub?.payment_id === paymentId && existingSub?.status === 'active') {
        // 이미 처리됨 — 중복 webhook 무시
        break
      }

      // 구독 정보에서 플랜 조회 → days 기반 만료일 계산
      const plan = (existingSub?.plan as PlanKey) ?? 'monthly'
      const days = PLANS[plan]?.days ?? 30

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days)

      await service
        .from('subscriptions')
        .update({
          status: 'active',
          payment_id: paymentId,
          expires_at: expiresAt.toISOString(),
        })
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

      // 만료일이 남아있으면 profiles는 업데이트하지 않음 (만료일까지 사용 가능)
      const { data: sub } = await service
        .from('subscriptions')
        .select('expires_at')
        .eq('user_id', userId)
        .single()

      if (!sub?.expires_at || new Date(sub.expires_at) <= new Date()) {
        await service
          .from('profiles')
          .update({ subscription_status: 'free' })
          .eq('id', userId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
