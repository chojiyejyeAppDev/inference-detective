import { EvaluationResult, Question, SlotFeedback } from '@/types'
import { LEVEL_UP_ACCURACY, LEVEL_UP_SESSIONS } from './levelConfig'

export function evaluateChain(
  question: Question,
  submittedChain: (string | null)[],
): Omit<EvaluationResult, 'level_up'> {
  const correctChain = question.correct_chain
  const filledSlots = submittedChain.filter(Boolean).length
  const totalSlots = correctChain.length

  if (filledSlots === 0) {
    return {
      is_correct: false,
      accuracy: 0,
      feedback: correctChain.map((_, i) => ({
        slot_index: i,
        sentence_id: submittedChain[i] ?? null,
        is_correct: false,
        hint: null,
      })),
      explanation: '추론 경로를 완성해주세요.',
    }
  }

  let correctCount = 0
  const feedback: SlotFeedback[] = correctChain.map((correctId, i) => {
    const submittedId = submittedChain[i] ?? null
    const isCorrect = submittedId === correctId
    if (isCorrect) correctCount++

    return {
      slot_index: i,
      sentence_id: submittedId,
      is_correct: isCorrect,
      hint: isCorrect
        ? null
        : generateSlotHint(question, i, submittedId, correctId),
    }
  })

  const accuracy = correctCount / totalSlots
  const isCorrect = accuracy >= 1.0

  const explanation = buildExplanation(accuracy, feedback, question)

  return { is_correct: isCorrect, accuracy, feedback, explanation }
}

function generateSlotHint(
  question: Question,
  slotIndex: number,
  submittedId: string | null,
  correctId: string,
): string {
  const correctSentence = question.sentences.find((s) => s.id === correctId)
  if (!correctSentence) return ''

  const position = slotIndex + 1
  const total = question.correct_chain.length

  if (slotIndex === 0) return `첫 번째 슬롯에는 주제를 도입하는 문장이 필요해요.`
  if (slotIndex === total - 1)
    return `마지막 슬롯에는 결론을 도출하는 문장이 와야 해요.`

  // 논리 접속어로 힌트 생성
  const connectors = ['따라서', '그러므로', '왜냐하면', '그런데', '즉', '결론적으로']
  const found = connectors.find((c) => correctSentence.text.includes(c))
  if (found) return `이 위치에는 "${found}"로 시작하거나 관련된 문장이 와야 해요.`

  return `${position}번째 슬롯을 다시 생각해보세요.`
}

function buildExplanation(
  accuracy: number,
  feedback: SlotFeedback[],
  _question: Question,
): string {
  if (accuracy >= 1.0) {
    return '완벽합니다! 모든 추론 경로를 올바르게 완성했어요.'
  }

  const wrongSlots = feedback
    .filter((f) => !f.is_correct)
    .map((f) => f.slot_index + 1)

  if (accuracy >= 0.8) {
    return `거의 다 맞혔어요! ${wrongSlots.join(', ')}번째 슬롯만 다시 살펴보세요.`
  }

  if (accuracy >= 0.5) {
    return `좋은 출발이에요! 지문의 논리 흐름을 처음부터 천천히 따라가 보세요.`
  }

  return `추론이 쉽지 않죠! 지문에서 "따라서", "왜냐하면" 같은 접속어에 주목해보세요.`
}

export function checkLevelUp(recentAccuracies: number[]): boolean {
  if (recentAccuracies.length < LEVEL_UP_SESSIONS) return false
  // recentAccuracies는 newest-first (DESC) 순서로 전달됨
  const lastN = recentAccuracies.slice(0, LEVEL_UP_SESSIONS)
  return lastN.every((a) => a >= LEVEL_UP_ACCURACY)
}
