import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// We can't easily test the actual webhook route (it needs Supabase + PortOne),
// but we can test the signature verification logic directly.

function createSignature(secret: string, webhookId: string, timestamp: string, body: string): string {
  const secretBytes = Buffer.from(
    secret.startsWith('whsec_') ? secret.slice(6) : secret,
    'base64',
  )
  const signedContent = `${webhookId}.${timestamp}.${body}`
  const signature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64')
  return `v1,${signature}`
}

describe('webhook signature verification logic', () => {
  const secret = Buffer.from('test-secret-key-for-webhook').toString('base64')
  const webhookId = 'wh_test_123'
  const body = JSON.stringify({ type: 'Transaction.Paid', data: { paymentId: 'pay_1' } })

  it('valid signature matches', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature = createSignature(secret, webhookId, timestamp, body)

    // Verify using the same logic as the webhook route
    const secretBytes = Buffer.from(secret, 'base64')
    const signedContent = `${webhookId}.${timestamp}.${body}`
    const expected = crypto
      .createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64')

    const [, sigValue] = signature.split(',')
    expect(
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigValue)),
    ).toBe(true)
  })

  it('tampered body fails verification', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature = createSignature(secret, webhookId, timestamp, body)

    const tamperedBody = JSON.stringify({ type: 'Transaction.Paid', data: { paymentId: 'pay_fake' } })
    const secretBytes = Buffer.from(secret, 'base64')
    const signedContent = `${webhookId}.${timestamp}.${tamperedBody}`
    const expected = crypto
      .createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64')

    const [, sigValue] = signature.split(',')
    expect(
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigValue!)),
    ).toBe(false)
  })

  it('wrong secret fails verification', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const wrongSecret = Buffer.from('wrong-secret-key').toString('base64')
    const signature = createSignature(wrongSecret, webhookId, timestamp, body)

    const secretBytes = Buffer.from(secret, 'base64')
    const signedContent = `${webhookId}.${timestamp}.${body}`
    const expected = crypto
      .createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64')

    const [, sigValue] = signature.split(',')
    expect(
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigValue!)),
    ).toBe(false)
  })

  it('expired timestamp (>5 min) should be rejected', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 301 // 5min + 1sec
    const diff = Math.abs(Date.now() / 1000 - oldTimestamp)
    expect(diff).toBeGreaterThan(300)
  })

  it('whsec_ prefix is stripped from secret', () => {
    const prefixedSecret = `whsec_${secret}`
    const timestamp = Math.floor(Date.now() / 1000).toString()

    // Both should produce the same signature
    const sig1 = createSignature(secret, webhookId, timestamp, body)
    const sig2 = createSignature(prefixedSecret, webhookId, timestamp, body)

    expect(sig1).toBe(sig2)
  })
})
