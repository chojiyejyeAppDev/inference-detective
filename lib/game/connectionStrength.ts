import { ConnectionStrength, Sentence } from '@/types'

// 논리 접속어 기반 연결 강도 계산 (실시간 UI 피드백용)
const STRONG_CONNECTORS = [
  '따라서', '그러므로', '결국', '즉', '결론적으로', '이처럼', '이로써',
]
const MEDIUM_CONNECTORS = [
  '왜냐하면', '그런데', '하지만', '반면', '또한', '더불어', '그리고',
  '이때', '이에', '이를', '이러한', '이와 같이',
]
const CAUSAL_PATTERNS = [
  /때문에/, /으로 인해/, /로 인하여/, /에 의해/, /덕분에/,
  /결과로/, /영향으로/, /작용으로/,
]

export function calculateConnectionStrength(
  prevSentence: Sentence | null,
  nextSentence: Sentence | null,
): 'strong' | 'medium' | 'weak' | 'empty' {
  if (!prevSentence || !nextSentence) return 'empty'

  const combined = prevSentence.text + ' ' + nextSentence.text
  const nextText = nextSentence.text

  if (STRONG_CONNECTORS.some((c) => nextText.includes(c))) return 'strong'
  if (MEDIUM_CONNECTORS.some((c) => nextText.includes(c))) return 'medium'
  if (CAUSAL_PATTERNS.some((p) => p.test(combined))) return 'medium'

  return 'weak'
}

export function buildConnectionMap(
  chain: (Sentence | null)[],
): ConnectionStrength[] {
  return chain.map((sentence, i) => {
    const prev = i > 0 ? chain[i - 1] : null
    return {
      slotIndex: i,
      strength: calculateConnectionStrength(prev, sentence),
    }
  })
}
