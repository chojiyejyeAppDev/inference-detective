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
  const chainExplanations = generateChainExplanations(question)
  const wrongAnalysis = analyzeWrongAnswers(question, submittedChain)

  return {
    is_correct: isCorrect,
    accuracy,
    feedback,
    explanation,
    chain_explanations: chainExplanations,
    detailed_explanation: question.detailed_explanation,
    wrong_analysis: wrongAnalysis.length > 0 ? wrongAnalysis : undefined,
  }
}

/**
 * Analyze each incorrectly placed sentence and explain why it's wrong at that position.
 */
function analyzeWrongAnswers(
  question: Question,
  submittedChain: (string | null)[],
): { sentence_id: string; why_wrong: string; user_placed_at: number }[] {
  const correctChain = question.correct_chain
  const results: { sentence_id: string; why_wrong: string; user_placed_at: number }[] = []

  for (let i = 0; i < correctChain.length; i++) {
    const submittedId = submittedChain[i] ?? null

    // Skip empty slots and correct answers
    if (!submittedId || submittedId === correctChain[i]) continue

    const isDistractor = !correctChain.includes(submittedId)

    if (isDistractor) {
      // Check for author-provided wrong answer analysis
      const authorAnalysis = question.wrong_answer_analysis?.find(
        (wa) => wa.sentence_id === submittedId,
      )
      if (authorAnalysis) {
        results.push({
          sentence_id: submittedId,
          why_wrong: authorAnalysis.why_wrong,
          user_placed_at: i,
        })
      } else {
        // Generate generic distractor explanation
        const sentence = question.sentences.find((s) => s.id === submittedId)
        const preview = sentence ? sentence.text.slice(0, 25) : ''
        results.push({
          sentence_id: submittedId,
          why_wrong: `"${preview}…"은(는) 논리적 추론 경로에 포함되지 않는 오답 문장이에요. 지문의 핵심 논리 흐름과 관련이 없거나, 논증을 뒷받침하지 못해요.`,
          user_placed_at: i,
        })
      }
    } else {
      // Sentence is in correct_chain but at wrong position
      const correctPosition = correctChain.indexOf(submittedId)
      const sentence = question.sentences.find((s) => s.id === submittedId)
      const preview = sentence ? sentence.text.slice(0, 20) : ''

      // Build a reason based on what should come at each position
      let reason: string
      if (correctPosition === 0) {
        reason = '이 문장은 논증의 출발점으로, 주제를 도입하는 역할을 해요.'
      } else if (correctPosition === correctChain.length - 1) {
        reason = '이 문장은 앞선 논리를 종합하여 결론으로 이끄는 마지막 단계예요.'
      } else {
        const prevId = correctChain[correctPosition - 1]
        const prevSentence = question.sentences.find((s) => s.id === prevId)
        const prevPreview = prevSentence ? prevSentence.text.slice(0, 15) : ''
        reason = `"${prevPreview}…" 뒤에 이어져야 논리적 흐름이 자연스러워요.`
      }

      results.push({
        sentence_id: submittedId,
        why_wrong: `이 문장("${preview}…")은 ${correctPosition + 1}번째 단계에 와야 합니다. ${reason}`,
        user_placed_at: i,
      })
    }
  }

  return results
}

function generateSlotHint(
  question: Question,
  slotIndex: number,
  submittedId: string | null,
  correctId: string,
): string {
  const correctSentence = question.sentences.find((s) => s.id === correctId)
  if (!correctSentence) return ''

  const total = question.correct_chain.length
  const correctPreview = correctSentence.text.slice(0, 15)

  // First slot: reference the correct sentence's opening
  if (slotIndex === 0) {
    return `첫 번째 슬롯에는 논증의 전제를 세우는 문장이 필요해요. "${correctPreview}…"로 시작하는 문장을 찾아보세요.`
  }

  // Last slot: reference conclusion connection
  if (slotIndex === total - 1) {
    const conclusionPreview = question.conclusion.slice(0, 15)
    return `마지막 슬롯에는 결론("${conclusionPreview}…")으로 이어지는 문장이 와야 해요. "${correctPreview}…"로 시작하는 문장을 확인해보세요.`
  }

  // Middle slots: reference relationship with previous sentence
  const prevCorrectId = question.correct_chain[slotIndex - 1]
  const prevSentence = question.sentences.find((s) => s.id === prevCorrectId)

  if (prevSentence) {
    // Check for logical connectors in the correct sentence
    const connectors = ['따라서', '그러므로', '왜냐하면', '그런데', '즉', '결론적으로', '이는', '특히', '반면', '그러나', '이처럼', '또한']
    const found = connectors.find((c) => correctSentence.text.includes(c))

    if (found) {
      const prevKeyword = extractKeyword(prevSentence.text)
      return `이 위치에는 앞 문장의 '${prevKeyword}'에 대한 ${getConnectorRole(found)}이(가) 와야 해요. "${found}"가 포함된 문장을 찾아보세요.`
    }

    const prevKeyword = extractKeyword(prevSentence.text)
    return `이 위치에는 앞 문장의 '${prevKeyword}'에 대한 근거나 결과가 와야 해요. "${correctPreview}…"로 시작하는 문장을 확인해보세요.`
  }

  return `${slotIndex + 1}번째 슬롯에는 앞뒤 문장을 논리적으로 연결하는 문장이 필요해요.`
}

/**
 * Extract a keyword (first noun-like phrase) from a sentence for hint generation.
 */
function extractKeyword(text: string): string {
  // Take meaningful content: skip common sentence starters and grab first content chunk
  const cleaned = text
    .replace(/^(이는|또한|특히|따라서|그러므로|즉|반면|그러나|그런데|왜냐하면|결론적으로|이처럼)\s*/, '')
    .trim()

  // Return first ~10 characters as keyword
  const keyword = cleaned.slice(0, 10).replace(/[,.].*$/, '').trim()
  return keyword || text.slice(0, 10)
}

/**
 * Map a connector to its logical role description.
 */
function getConnectorRole(connector: string): string {
  const roles: Record<string, string> = {
    '따라서': '결론 도출',
    '그러므로': '논리적 귀결',
    '왜냐하면': '근거 제시',
    '그런데': '관점 전환',
    '즉': '구체화/환언',
    '결론적으로': '종합 정리',
    '이는': '부연 설명',
    '특히': '구체적 사례',
    '반면': '대조적 관점',
    '그러나': '반대 주장',
    '이처럼': '종합 정리',
    '또한': '추가 근거',
  }
  return roles[connector] ?? '논리적 연결'
}

function buildExplanation(
  accuracy: number,
  feedback: SlotFeedback[],
  question: Question,
): string {
  if (accuracy >= 1.0) {
    return '완벽합니다! 논리적 추론 경로를 정확하게 파악했어요.'
  }

  const wrongSlots = feedback
    .filter((f) => !f.is_correct)
    .map((f) => f.slot_index + 1)

  if (accuracy >= 0.8) {
    // Generate a specific hint about one of the wrong slots
    const firstWrongFeedback = feedback.find((f) => !f.is_correct)
    let specificHint = ''
    if (firstWrongFeedback) {
      const correctId = question.correct_chain[firstWrongFeedback.slot_index]
      const correctSentence = question.sentences.find((s) => s.id === correctId)
      if (correctSentence) {
        const preview = correctSentence.text.slice(0, 15)
        specificHint = ` 힌트: ${firstWrongFeedback.slot_index + 1}번 위치에는 "${preview}…"와 관련된 문장이 들어가야 해요.`
      }
    }
    return `거의 완벽해요! ${wrongSlots.join(', ')}번 위치의 논리적 연결을 다시 살펴보세요.${specificHint}`
  }

  if (accuracy >= 0.5) {
    return '핵심 논리를 부분적으로 파악했어요. 지문에서 원인→결과 관계를 찾아 순서를 재구성해 보세요.'
  }

  return '지문의 논리 구조를 처음부터 분석해 보세요. 각 문장이 \'왜\' 다음 문장으로 이어지는지 생각해 보세요.'
}

/**
 * Generate explanations for why each step in the correct chain follows the previous one.
 * Uses the question's chain_explanations if available, otherwise auto-generates.
 */
function generateChainExplanations(question: Question): string[] {
  // If question has author-provided explanations, use those
  if (question.chain_explanations && question.chain_explanations.length > 0) {
    return question.chain_explanations
  }

  // Auto-generate explanations from the correct chain
  const chain = question.correct_chain
  const explanations: string[] = []
  const conclusionPreview = question.conclusion.slice(0, 20)

  const CONNECTORS: Record<string, string> = {
    '따라서': '앞의 내용으로부터 결론을 도출하는 연결',
    '그러므로': '논리적 귀결을 나타내는 연결',
    '왜냐하면': '앞의 주장에 대한 근거를 제시하는 연결',
    '그런데': '새로운 관점이나 전환을 도입하는 연결',
    '즉': '앞의 내용을 구체화하거나 바꿔 말하는 연결',
    '결론적으로': '전체 논의를 종합하는 연결',
    '이는': '앞의 내용을 부연 설명하는 연결',
    '특히': '앞의 내용에서 구체적 사례를 강조하는 연결',
    '반면': '대조적 관점을 제시하는 연결',
    '그러나': '반대되는 주장을 도입하는 연결',
    '이처럼': '앞의 내용을 종합 정리하는 연결',
    '또한': '추가적인 근거를 보충하는 연결',
  }

  for (let i = 0; i < chain.length; i++) {
    const sentence = question.sentences.find((s) => s.id === chain[i])
    if (!sentence) {
      explanations.push('')
      continue
    }

    // First slot
    if (i === 0) {
      explanations.push(
        '논증의 전제를 세우는 출발점이에요. 이 문장이 이후 논리 전개의 기반이 됩니다.',
      )
      continue
    }

    // Last slot
    if (i === chain.length - 1) {
      explanations.push(
        `앞선 논리를 종합하여 결론("${conclusionPreview}…")으로 연결하는 최종 단계예요.`,
      )
      continue
    }

    // Middle slots: check for logical connectors
    let found = false
    for (const [connector, desc] of Object.entries(CONNECTORS)) {
      if (sentence.text.includes(connector)) {
        const prevSentence = question.sentences.find((s) => s.id === chain[i - 1])
        const nextSentence = question.sentences.find((s) => s.id === chain[i + 1])
        const prevPreview = prevSentence ? `"${prevSentence.text.slice(0, 20)}…"` : '앞 문장'
        const nextPreview = nextSentence ? `"${nextSentence.text.slice(0, 20)}…"` : '다음 문장'

        explanations.push(
          `${prevPreview}의 내용을 받아 "${connector}"를 통해 ${desc}을 만들고, ${nextPreview}으로 논리를 이어가요.`,
        )
        found = true
        break
      }
    }

    if (!found) {
      // Analyze relationship between prev and next sentences
      const prevSentence = question.sentences.find((s) => s.id === chain[i - 1])
      const nextSentence = question.sentences.find((s) => s.id === chain[i + 1])
      const prevPreview = prevSentence ? `"${prevSentence.text.slice(0, 20)}…"` : '앞 문장'
      const nextPreview = nextSentence ? `"${nextSentence.text.slice(0, 20)}…"` : '다음 문장'

      explanations.push(
        `${prevPreview}에서 제시된 논점을 발전시키며, ${nextPreview}으로의 논리적 다리 역할을 해요.`,
      )
    }
  }

  return explanations
}

export function checkLevelUp(recentAccuracies: number[]): boolean {
  if (recentAccuracies.length < LEVEL_UP_SESSIONS) return false
  // recentAccuracies는 newest-first (DESC) 순서로 전달됨
  const lastN = recentAccuracies.slice(0, LEVEL_UP_SESSIONS)
  return lastN.every((a) => a >= LEVEL_UP_ACCURACY)
}
