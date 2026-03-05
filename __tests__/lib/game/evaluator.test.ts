import { describe, it, expect } from 'vitest'
import { evaluateChain, checkLevelUp } from '@/lib/game/evaluator'
import { Question } from '@/types'

const makeQuestion = (overrides?: Partial<Question>): Question => ({
  id: 'test-q-1',
  difficulty_level: 1,
  topic: 'humanities',
  passage: '테스트 지문입니다.',
  sentences: [
    { id: 'a', text: '첫 번째 문장' },
    { id: 'b', text: '따라서 두 번째 문장' },
    { id: 'c', text: '결론적으로 세 번째 문장' },
    { id: 'd', text: '오답 문장' },
  ],
  conclusion: '테스트 결론',
  correct_chain: ['a', 'b', 'c'],
  hints: [
    { level: 1, text: '힌트 1' },
    { level: 2, text: '힌트 2' },
  ],
  ...overrides,
})

describe('evaluateChain', () => {
  it('완벽한 체인: 100% 정확도, is_correct = true', () => {
    const q = makeQuestion()
    const result = evaluateChain(q, ['a', 'b', 'c'])

    expect(result.is_correct).toBe(true)
    expect(result.accuracy).toBe(1.0)
    expect(result.feedback).toHaveLength(3)
    expect(result.feedback.every((f) => f.is_correct)).toBe(true)
    expect(result.feedback.every((f) => f.hint === null)).toBe(true)
  })

  it('빈 체인: 0% 정확도', () => {
    const q = makeQuestion()
    const result = evaluateChain(q, [null, null, null])

    expect(result.is_correct).toBe(false)
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('완성해주세요')
  })

  it('부분 정답: 1/3 정확도', () => {
    const q = makeQuestion()
    const result = evaluateChain(q, ['a', 'c', 'b'])

    expect(result.is_correct).toBe(false)
    expect(result.accuracy).toBeCloseTo(1 / 3)
    expect(result.feedback[0].is_correct).toBe(true)
    expect(result.feedback[1].is_correct).toBe(false)
    expect(result.feedback[2].is_correct).toBe(false)
  })

  it('2/3 정답: 80% 이상 설명 생성', () => {
    const q = makeQuestion()
    const result = evaluateChain(q, ['a', 'b', 'd'])

    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.is_correct).toBe(false)
    expect(result.feedback[2].is_correct).toBe(false)
    expect(result.feedback[2].hint).toBeTruthy()
  })

  it('순서 완전 틀림: 0/3 정확도', () => {
    const q = makeQuestion()
    const result = evaluateChain(q, ['c', 'a', 'b'])

    expect(result.is_correct).toBe(false)
    expect(result.accuracy).toBe(0)
  })

  it('첫 번째 슬롯 오답 시 도입 문장 힌트 제공', () => {
    const q = makeQuestion()
    const result = evaluateChain(q, ['b', 'a', 'c'])

    expect(result.feedback[0].hint).toContain('주제를 도입하는')
  })

  it('마지막 슬롯 오답 시 결론 문장 힌트 제공', () => {
    const q = makeQuestion()
    const result = evaluateChain(q, ['a', 'b', 'd'])

    expect(result.feedback[2].hint).toContain('결론을 도출하는')
  })

  it('중간 슬롯 오답 시 논리 접속어 힌트 제공', () => {
    const q = makeQuestion()
    // b는 "따라서"를 포함하므로 접속어 힌트가 나와야 함
    const result = evaluateChain(q, ['a', 'c', 'b'])

    expect(result.feedback[1].hint).toContain('따라서')
  })

  it('4슬롯 문제도 정상 처리', () => {
    const q = makeQuestion({
      sentences: [
        { id: 'a', text: '문장 A' },
        { id: 'b', text: '문장 B' },
        { id: 'c', text: '문장 C' },
        { id: 'd', text: '문장 D' },
        { id: 'e', text: '오답' },
      ],
      correct_chain: ['a', 'b', 'c', 'd'],
    })
    const result = evaluateChain(q, ['a', 'b', 'c', 'd'])

    expect(result.is_correct).toBe(true)
    expect(result.accuracy).toBe(1.0)
    expect(result.feedback).toHaveLength(4)
  })
})

describe('checkLevelUp', () => {
  it('3연속 80% 이상이면 레벨업', () => {
    expect(checkLevelUp([0.8, 0.9, 1.0])).toBe(true)
  })

  it('정확히 80%가 3번이면 레벨업', () => {
    expect(checkLevelUp([0.8, 0.8, 0.8])).toBe(true)
  })

  it('세션 수 부족하면 레벨업 불가', () => {
    expect(checkLevelUp([1.0, 1.0])).toBe(false)
    expect(checkLevelUp([1.0])).toBe(false)
    expect(checkLevelUp([])).toBe(false)
  })

  it('마지막 3세션 중 하나라도 80% 미만이면 레벨업 불가', () => {
    expect(checkLevelUp([0.8, 0.79, 0.9])).toBe(false)
    expect(checkLevelUp([0.5, 0.8, 0.8])).toBe(false)
  })

  it('이전 세션이 나빠도 마지막 3세션이 80%+ 이면 레벨업', () => {
    expect(checkLevelUp([0.1, 0.2, 0.3, 0.85, 0.9, 0.95])).toBe(true)
  })

  it('마지막 3세션만 검사 (중간에 나쁜 세션 포함)', () => {
    expect(checkLevelUp([0.9, 0.9, 0.5, 0.9, 0.9])).toBe(false)
  })
})
