import { describe, it, expect } from 'vitest'
import {
  evaluateSchema,
  hintSchema,
  subscribeSchema,
  redeemSchema,
  generateQuestionsSchema,
} from '@/lib/api/schemas'

describe('evaluateSchema', () => {
  it('accepts valid input', () => {
    const result = evaluateSchema.safeParse({
      question_id: '550e8400-e29b-41d4-a716-446655440000',
      submitted_chain: ['a', 'b', null],
      hints_used: 2,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hints_used).toBe(2)
    }
  })

  it('defaults hints_used to 0', () => {
    const result = evaluateSchema.safeParse({
      question_id: '550e8400-e29b-41d4-a716-446655440000',
      submitted_chain: ['a'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hints_used).toBe(0)
    }
  })

  it('rejects non-UUID question_id', () => {
    const result = evaluateSchema.safeParse({
      question_id: 'not-a-uuid',
      submitted_chain: ['a'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty submitted_chain', () => {
    const result = evaluateSchema.safeParse({
      question_id: '550e8400-e29b-41d4-a716-446655440000',
      submitted_chain: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects chain longer than 10', () => {
    const result = evaluateSchema.safeParse({
      question_id: '550e8400-e29b-41d4-a716-446655440000',
      submitted_chain: Array(11).fill('a'),
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-string/null chain entries', () => {
    const result = evaluateSchema.safeParse({
      question_id: '550e8400-e29b-41d4-a716-446655440000',
      submitted_chain: [123],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    expect(evaluateSchema.safeParse({}).success).toBe(false)
    expect(evaluateSchema.safeParse({ question_id: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(false)
  })
})

describe('hintSchema', () => {
  it('accepts valid input', () => {
    const result = hintSchema.safeParse({
      question_id: '550e8400-e29b-41d4-a716-446655440000',
      hint_step: 3,
    })
    expect(result.success).toBe(true)
  })

  it('defaults hint_step to 1', () => {
    const result = hintSchema.safeParse({
      question_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hint_step).toBe(1)
    }
  })

  it('rejects hint_step > 10', () => {
    const result = hintSchema.safeParse({
      question_id: '550e8400-e29b-41d4-a716-446655440000',
      hint_step: 11,
    })
    expect(result.success).toBe(false)
  })
})

describe('subscribeSchema', () => {
  it('accepts plan only', () => {
    const result = subscribeSchema.safeParse({ plan: 'weekly' })
    expect(result.success).toBe(true)
  })

  it('accepts plan + billingKey', () => {
    const result = subscribeSchema.safeParse({
      plan: 'monthly',
      billingKey: 'bk_test_123',
    })
    expect(result.success).toBe(true)
  })

  it('accepts plan + paymentId', () => {
    const result = subscribeSchema.safeParse({
      plan: 'weekly',
      paymentId: 'payment_user_123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty plan', () => {
    const result = subscribeSchema.safeParse({ plan: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing plan', () => {
    const result = subscribeSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts paymentMethod kakaopay', () => {
    const result = subscribeSchema.safeParse({ plan: 'monthly', paymentMethod: 'kakaopay' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.paymentMethod).toBe('kakaopay')
    }
  })

  it('defaults paymentMethod to card', () => {
    const result = subscribeSchema.safeParse({ plan: 'monthly' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.paymentMethod).toBe('card')
    }
  })

  it('rejects invalid paymentMethod', () => {
    const result = subscribeSchema.safeParse({ plan: 'monthly', paymentMethod: 'bitcoin' })
    expect(result.success).toBe(false)
  })
})

describe('redeemSchema', () => {
  it('accepts valid invite code', () => {
    const result = redeemSchema.safeParse({ invite_code: 'ABC123' })
    expect(result.success).toBe(true)
  })

  it('trims whitespace', () => {
    const result = redeemSchema.safeParse({ invite_code: '  ABC123  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.invite_code).toBe('ABC123')
    }
  })

  it('rejects empty invite code', () => {
    const result = redeemSchema.safeParse({ invite_code: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invite code > 20 chars', () => {
    const result = redeemSchema.safeParse({ invite_code: 'A'.repeat(21) })
    expect(result.success).toBe(false)
  })
})

describe('generateQuestionsSchema', () => {
  it('accepts valid input', () => {
    const result = generateQuestionsSchema.safeParse({
      text: '테스트 지문',
      level: 3,
      topic: 'science',
      count: 5,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.level).toBe(3)
      expect(result.data.count).toBe(5)
    }
  })

  it('coerces string level to number', () => {
    const result = generateQuestionsSchema.safeParse({
      text: '테스트',
      level: '4',
      topic: 'humanities',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.level).toBe(4)
    }
  })

  it('clamps level to 1-7', () => {
    const r1 = generateQuestionsSchema.safeParse({ text: 'a', level: 0, topic: 'b' })
    expect(r1.success).toBe(false) // 0 < min(1)

    const r2 = generateQuestionsSchema.safeParse({ text: 'a', level: 8, topic: 'b' })
    expect(r2.success).toBe(false) // 8 > max(7)
  })

  it('defaults count to 3', () => {
    const result = generateQuestionsSchema.safeParse({
      text: '지문',
      level: 1,
      topic: 'science',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.count).toBe(3)
    }
  })

  it('rejects empty text', () => {
    const result = generateQuestionsSchema.safeParse({
      text: '',
      level: 1,
      topic: 'science',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty topic', () => {
    const result = generateQuestionsSchema.safeParse({
      text: 'something',
      level: 1,
      topic: '  ',
    })
    expect(result.success).toBe(false)
  })
})
