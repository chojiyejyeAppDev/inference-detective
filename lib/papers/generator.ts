import OpenAI from 'openai'
import { validateQuestion } from './validator'
import type { Topic } from '@/lib/questions/types'

const LEVEL_GUIDE: Record<number, { slots: number; hints: number; passageLen: string; style: string }> = {
  1: { slots: 3, hints: 3, passageLen: '200~300자 (6~7문장)', style: '일상/기초 인과. 짧고 명확한 문장.' },
  2: { slots: 3, hints: 3, passageLen: '200~350자 (6~8문장)', style: '부분 추상 개념 포함. 약간의 학술 용어.' },
  3: { slots: 4, hints: 3, passageLen: '250~400자 (6~9문장)', style: '수식어/종속절 포함. 복합 문장 사용.' },
  4: { slots: 4, hints: 3, passageLen: '300~450자 (6~10문장)', style: '모의고사 수준. 전문 용어와 복합 인과.' },
  5: { slots: 5, hints: 1, passageLen: '350~500자 (7~11문장)', style: '대조/역전 논리. 반례와 예외 포함.' },
  6: { slots: 6, hints: 1, passageLen: '450~650자 (9~12문장)', style: '수능 실전 수준. 다층적 논증 구조.' },
  7: { slots: 7, hints: 0, passageLen: '550~800자 (11~15문장)', style: '고난도 추상. 복잡한 논리 구조와 전문 개념.' },
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

function buildPrompt(text: string, level: number, topic: Topic, count: number): string {
  const config = LEVEL_GUIDE[level] ?? LEVEL_GUIDE[3]
  const { slots, hints, passageLen, style } = config

  const sourceInstruction = text.length > 0
    ? `아래 텍스트를 읽고, 이 내용에서 인과 관계 추론 문제를 ${count}개 만들어주세요.`
    : `"${topic}" 주제로 수능 비문학 스타일의 인과 관계 추론 문제를 ${count}개 만들어주세요. 지문도 직접 작성하세요.`

  return `당신은 수능 비문학 추론 문제 전문 출제자입니다.

${sourceInstruction}

## 이 문제의 설정
- 레벨: ${level}
- 주제: ${topic}
- 지문 길이: ${passageLen}
- 스타일: ${style}
- 정답 카드: ${slots}장
- 오답 카드: 1~2장 (정답 카드와 합쳐 총 ${slots + 1}~${slots + 2}장)
- 힌트: ${hints}개${hints === 0 ? ' (빈 배열)' : ''}

## 핵심 규칙

### passage (지문)
- ${text.length > 0 ? '원문에서 핵심 논리를 추출하여 한국어로 재구성.' : '주제에 맞는 학술적 지문을 직접 작성.'}
- 반드시 ${passageLen} 범위로 작성.
- 레벨이 높을수록 복합 문장, 전문 용어, 다층 논증을 사용.

### conclusion (결론) — 중요
- 결론은 지문에 직접 등장하지 않는 문장이어야 합니다.
- 지문의 내용을 종합하여 논리적으로 추론할 수 있는 명제를 작성하세요.
- 지문의 문장을 그대로 복사하거나 요약하는 것은 금지합니다.

### sentences (보기 카드)
- 정답 카드 ${slots}장: 각 카드는 인과 관계의 한 단계. 올바른 순서로 배열하면 결론에 도달.
- 오답 카드 1~2장: 그럴듯하지만 논리적 인과에 맞지 않는 내용.
- id는 알파벳 순서 (a, b, c, d, ...).

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
    "correct_chain": ["a", "b", "c"${slots > 3 ? ', ...' : ''}],
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
