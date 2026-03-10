const LEVEL_SLOTS: Record<number, number> = {
  1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5, 7: 5,
}

const LEVEL_HINTS: Record<number, number> = {
  1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 0,
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateQuestion(q: unknown): ValidationResult {
  const errors: string[] = []
  const question = q as Record<string, unknown>

  if (!question.passage || typeof question.passage !== 'string' || question.passage.trim().length === 0) {
    errors.push('passage가 비어있습니다')
  }
  if (!question.conclusion || typeof question.conclusion !== 'string' || question.conclusion.trim().length === 0) {
    errors.push('conclusion이 비어있습니다')
  }

  const level = Number(question.difficulty_level)
  if (!level || level < 1 || level > 7) {
    errors.push(`유효하지 않은 레벨: ${question.difficulty_level}`)
    return { valid: false, errors }
  }

  const sentences = question.sentences as Array<{ id: string; text: string }> | undefined
  if (!Array.isArray(sentences) || sentences.length === 0) {
    errors.push('sentences가 비어있거나 배열이 아닙니다')
    return { valid: false, errors }
  }

  const sentenceIds = new Set(sentences.map(s => s.id))

  const chain = question.correct_chain as string[] | undefined
  if (!Array.isArray(chain)) {
    errors.push('correct_chain이 배열이 아닙니다')
    return { valid: false, errors }
  }

  const expectedSlots = LEVEL_SLOTS[level]
  if (chain.length !== expectedSlots) {
    errors.push(`correct_chain 길이 ${chain.length} ≠ 레벨 ${level} 슬롯 수 ${expectedSlots}`)
  }

  for (const id of chain) {
    if (!sentenceIds.has(id)) {
      errors.push(`correct_chain의 id "${id}"가 sentences에 없습니다`)
    }
  }

  const distractorCount = sentences.length - chain.length
  if (distractorCount < 1) {
    errors.push(`오답 카드가 없습니다 (sentences ${sentences.length}개, chain ${chain.length}개)`)
  }

  const hints = question.hints as Array<{ level: number; text: string }> | undefined
  const expectedHints = LEVEL_HINTS[level]
  if (!Array.isArray(hints)) {
    errors.push('hints가 배열이 아닙니다')
  } else if (hints.length !== expectedHints) {
    errors.push(`힌트 ${hints.length}개 ≠ 레벨 ${level} 기준 ${expectedHints}개`)
  }

  return { valid: errors.length === 0, errors }
}
