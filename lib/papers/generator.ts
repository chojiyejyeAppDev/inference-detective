import OpenAI from 'openai'
import { validateQuestion } from './validator'
import type { Topic } from '@/lib/questions/types'

type DistractorType = 'distortion' | 'pseudo-answer' | 'mixed'

const LEVEL_GUIDE: Record<number, {
  slots: number
  distractors: number
  distractorType: DistractorType
  hints: number
  passageLen: string
  style: string
}> = {
  1: { slots: 3, distractors: 1, distractorType: 'distortion', hints: 3, passageLen: '150~250자 (6~8문장)', style: '일상/기초 인과. 짧고 명확한 문장.' },
  2: { slots: 3, distractors: 1, distractorType: 'distortion', hints: 3, passageLen: '200~300자 (6~8문장)', style: '부분 추상 개념 포함. 약간의 학술 용어.' },
  3: { slots: 4, distractors: 1, distractorType: 'distortion', hints: 3, passageLen: '300~450자 (최소 10문장)', style: '수식어/종속절 포함. 복합 문장 사용.' },
  4: { slots: 4, distractors: 1, distractorType: 'pseudo-answer', hints: 3, passageLen: '350~500자 (최소 10문장)', style: '모의고사 수준. 전문 용어와 복합 인과.' },
  5: { slots: 5, distractors: 1, distractorType: 'pseudo-answer', hints: 3, passageLen: '400~550자 (10~12문장)', style: '대조/역전 논리. 반례와 예외 포함.' },
  6: { slots: 5, distractors: 2, distractorType: 'mixed', hints: 3, passageLen: '500~700자 (12~15문장)', style: '수능 실전 수준. 다층적 논증 구조.' },
  7: { slots: 5, distractors: 2, distractorType: 'mixed', hints: 0, passageLen: '600~800자 (13~15문장)', style: '고난도 추상. 복잡한 논리 구조와 전문 개념.' },
}

const TOPICS: Topic[] = ['humanities', 'social', 'science', 'tech', 'arts']

export interface GenerateOptions {
  text: string
  level: number
  topic: Topic
  count: number
  paperId?: string
}

export interface GeneratedQuestion {
  difficulty_level: number
  topic: string
  passage: string
  sentences: Array<{ id: string; text: string }>
  conclusion: string
  correct_chain: string[]
  hints: Array<{ level: number; text: string }>
  source: string
  paper_id: string | null
  auto_generated: boolean
}

export interface GenerateResult {
  questions: GeneratedQuestion[]
  errors: string[]
}

function buildDistractorInstruction(type: DistractorType, count: number): string {
  const base = `- 오답 카드 ${count}장을 다음 규칙에 따라 만드세요.\n`

  const rules: Record<DistractorType, string> = {
    distortion: `${base}### 오답 유형: 왜곡형
- 지문에 등장하는 개념과 용어를 사용하되, 인과관계를 왜곡하세요.
- 허용되는 왜곡 기법:
  (1) 원인과 결과를 뒤바꿈
  (2) 필요조건을 충분조건으로 바꿈
  (3) 상관관계를 인과관계로 전환
  (4) 지문의 논리를 과잉 일반화하거나 축소
- 오답 카드는 정답 카드와 텍스트 길이, 문체가 유사해야 합니다.`,

    'pseudo-answer': `${base}### 오답 유형: 유사 정답형
- 정답 체인의 특정 단계와 비슷하지만 인과 경로가 미묘하게 다른 진술을 만드세요.
- 이 카드를 정답 체인에 넣으면 논리가 깨지지만, 얼핏 보면 들어맞는 것처럼 보여야 합니다.
- 정답 카드와 텍스트 길이, 문체가 반드시 동일해야 합니다.
- 오답이 끼어들 수 있는 위치가 명확해야 합니다.`,

    mixed: `${base}### 오답 유형: 혼합 (왜곡형 1개 + 유사 정답형 1개)
- 왜곡형 1장: 지문의 개념을 사용하되 인과관계를 왜곡한 카드.
- 유사 정답형 1장: 정답 체인의 특정 단계와 비슷하지만 인과 경로가 다른 카드.
- 두 오답 카드 모두 정답 카드와 텍스트 길이, 문체가 동일해야 합니다.
- 유사 정답형은 체인의 서로 다른 위치에 끼어들 수 있어야 합니다.`,
  }

  return rules[type] + `

### 오답 금지 사항 (절대 위반 금지)
- "반드시", "완전히", "모든", "~만이", "전혀", "항상", "절대" 등 극단적 한정어 사용 금지.
- 지문 내용과 정반대인 내용만으로 구성된 오답 금지.
- 상식만으로 제거 가능한 오답 금지.
- 지문을 읽지 않고는 오답 여부를 판단할 수 없어야 합니다.`
}

function buildPrompt(text: string, level: number, topic: Topic, count: number): string {
  const config = LEVEL_GUIDE[level] ?? LEVEL_GUIDE[3]
  const { slots, distractors, distractorType, hints, passageLen, style } = config
  const totalCards = slots + distractors

  const sourceInstruction = text.length > 0
    ? `아래 논문/텍스트를 읽고, 핵심 논증 구조를 추출하여 수능 비문학 스타일의 인과 관계 추론 문제를 ${count}개 만들어주세요. 지문은 원문을 그대로 옮기지 말고 한국어로 재구성하세요.`
    : `"${topic}" 주제로 수능 비문학 스타일의 인과 관계 추론 문제를 ${count}개 만들어주세요. 지문도 직접 작성하세요.`

  const distractorInst = buildDistractorInstruction(distractorType, distractors)

  return `당신은 수능 비문학 추론 문제 전문 출제자입니다.

${sourceInstruction}

## 이 문제의 설정
- 레벨: ${level}
- 주제: ${topic}
- 지문 길이: ${passageLen}
- 스타일: ${style}
- 정답 카드: ${slots}장
- 오답 카드: ${distractors}장 (총 ${totalCards}장)
- 힌트: ${hints}개${hints === 0 ? ' (빈 배열)' : ''}

## 핵심 규칙

### passage (지문)
- ${text.length > 0 ? '원문(논문)에서 핵심 논증 구조를 추출하여 수능 비문학 스타일의 한국어 지문으로 재구성.' : '주제에 맞는 학술적 지문을 직접 작성.'}
- 반드시 ${passageLen} 범위로 작성.
- 레벨이 높을수록 복합 문장, 전문 용어, 다층 논증을 사용.

### conclusion (결론) — 중요
- 결론은 지문에 직접 등장하지 않는 문장이어야 합니다.
- 지문의 내용을 종합하여 논리적으로 추론할 수 있는 명제를 작성하세요.
- 지문의 문장을 그대로 복사하거나 요약하는 것은 금지합니다.

### sentences (보기 카드)
- 정답 카드 ${slots}장: 각 카드는 인과 관계의 한 단계. 올바른 순서로 배열하면 결론에 도달.
${distractorInst}

### 카드 배치 규칙 — 중요
1. **id 셔플**: 카드의 id(a, b, c, ...)가 정답 체인 순서와 일치하지 않도록 배치하세요.
   - 나쁜 예: correct_chain이 ["a", "b", "c", "d"] (알파벳순 = 정답순)
   - 좋은 예: correct_chain이 ["c", "a", "d", "b"] (알파벳순 ≠ 정답순)
   - 오답 카드의 id도 정답 카드 사이에 섞어 배치하세요.
2. **텍스트 재구성**: 카드 텍스트는 지문의 문장을 그대로 복사하지 마세요. 동일한 논리적 내용을 다른 표현으로 재구성하세요.

### correct_chain (정답 순서)
- 정답 카드의 id를 인과 순서대로 배열. 반드시 ${slots}개.

### hints (힌트)
${hints > 0 ? `- ${hints}개 작성. level 1이 가장 추상적 힌트, 숫자가 클수록 구체적.` : '- 이 레벨은 힌트 없음 — hints를 빈 배열 []로.'}

## 출력 형식
반드시 JSON 배열만 출력하세요. 마크다운이나 설명 없이 순수 JSON만.

[
  {
    "difficulty_level": ${level},
    "topic": "${topic}",
    "passage": "...",
    "sentences": [
      {"id": "a", "text": "..."},
      {"id": "b", "text": "..."}
    ],
    "conclusion": "지문에 없지만 추론 가능한 명제",
    "correct_chain": ["c", "a", "d", "b"${slots > 4 ? ', ...' : ''}],
    "hints": [${hints > 0 ? '{"level": 1, "text": "..."}, ...' : ''}]
  }
]
${text.length > 0 ? `\n## 입력 텍스트\n${text.slice(0, 15000)}` : ''}`
}

export async function generateQuestions(options: GenerateOptions): Promise<GenerateResult> {
  const { text, level, topic, count, paperId } = options

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { questions: [], errors: ['OPENAI_API_KEY가 설정되지 않았습니다'] }
  }

  const openai = new OpenAI({ apiKey })
  const prompt = buildPrompt(text, level, topic, Math.min(Math.max(count, 1), 10))

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    })

    const content = completion.choices[0]?.message?.content ?? ''
    let jsonStr = content.trim()
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const rawQuestions = JSON.parse(jsonStr)
    if (!Array.isArray(rawQuestions)) {
      return { questions: [], errors: ['AI가 배열 형식으로 생성하지 못했습니다'] }
    }

    const validQuestions: GeneratedQuestion[] = []
    const errors: string[] = []

    for (let i = 0; i < rawQuestions.length; i++) {
      const result = validateQuestion(rawQuestions[i])
      if (result.valid) {
        validQuestions.push({
          ...rawQuestions[i],
          source: text.length > 0 ? 'paper' : 'ai_generated',
          paper_id: paperId ?? null,
          auto_generated: true,
        })
      } else {
        errors.push(`문제 ${i + 1} 검증 실패: ${result.errors.join(', ')}`)
      }
    }

    return { questions: validQuestions, errors }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { questions: [], errors: [`AI 생성 실패: ${message}`] }
  }
}

export function pickLeastUsedTopic(topicCounts: Record<Topic, number>): Topic {
  let minTopic: Topic = TOPICS[0]
  let minCount = Infinity
  for (const t of TOPICS) {
    if ((topicCounts[t] ?? 0) < minCount) {
      minCount = topicCounts[t] ?? 0
      minTopic = t
    }
  }
  return minTopic
}
