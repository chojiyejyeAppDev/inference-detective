import { z } from 'zod'

// UUID pattern
const uuid = z.string().uuid()

// ── Game API ──

export const evaluateSchema = z.object({
  question_id: uuid,
  submitted_chain: z
    .array(z.string().min(1))
    .min(1)
    .max(10),
  hints_used: z.number().int().min(0).max(10).optional().default(0),
})

export const hintSchema = z.object({
  question_id: uuid,
  hint_step: z.number().int().min(1).max(10).optional().default(1),
})

// ── Payment API ──

export const subscribeSchema = z.object({
  billingKey: z.string().optional(),
  paymentId: z.string().optional(),
  plan: z.string().min(1),
})

// ── Invite API ──

export const redeemSchema = z.object({
  invite_code: z.string().trim().min(1).max(20),
})

// ── Admin API ──

export const generateQuestionsSchema = z.object({
  text: z.string().trim().min(1, '지문 텍스트를 입력해주세요.'),
  level: z.coerce.number().int().min(1).max(7).default(1),
  topic: z.string().trim().min(1, '주제를 입력해주세요.'),
  count: z.coerce.number().int().min(1).max(10).default(3),
})
