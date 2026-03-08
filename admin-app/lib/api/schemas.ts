import { z } from 'zod'

export const generateQuestionsSchema = z.object({
  text: z.string().trim().min(1, '지문 텍스트를 입력해주세요.'),
  level: z.coerce.number().int().min(1).max(7).default(1),
  topic: z.string().trim().min(1, '주제를 입력해주세요.'),
  count: z.coerce.number().int().min(1).max(10).default(3),
})
