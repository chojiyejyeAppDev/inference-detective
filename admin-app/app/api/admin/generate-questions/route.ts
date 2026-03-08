import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { generateQuestionsSchema } from '@/lib/api/schemas'

const LEVEL_GUIDE: Record<number, { slots: number; hints: number; passageLen: string; style: string }> = {
  1: { slots: 3, hints: 3, passageLen: '80~120자 (3문장)', style: '일상/기초 인과. 짧고 명확한 문장.' },
  2: { slots: 3, hints: 3, passageLen: '80~150자 (3문장)', style: '부분 추상 개념 포함. 약간의 학술 용어.' },
  3: { slots: 4, hints: 3, passageLen: '150~200자 (4~5문장)', style: '수식어/종속절 포함. 복합 문장 사용.' },
  4: { slots: 4, hints: 3, passageLen: '250~350자 (5~7문장)', style: '모의고사 수준. 전문 용어와 복합 인과.' },
  5: { slots: 5, hints: 1, passageLen: '350~500자 (7~9문장)', style: '대조/역전 논리. 반례와 예외 포함.' },
  6: { slots: 6, hints: 1, passageLen: '450~650자 (9~12문장)', style: '수능 실전 수준. 다층적 논증 구조.' },
  7: { slots: 7, hints: 0, passageLen: '550~800자 (11~15문장)', style: '고난도 추상. 복잡한 논리 구조와 전문 개념.' },
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = generateQuestionsSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { text, level, topic, count } = parsed.data

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
      { status: 500 },
    )
  }

  const openai = new OpenAI({ apiKey })

  const config = LEVEL_GUIDE[level] ?? LEVEL_GUIDE[3]
  const { slots: slotCount, hints: hintCount, passageLen, style } = config

  const clampedCount = Math.min(Math.max(count, 1), 10)

  const prompt = `당신은 수능 비문학 추론 문제 전문 출제자입니다.

아래 텍스트를 읽고, 이 내용에서 인과 관계 추론 문제를 ${clampedCount}개 만들어주세요.

## 이 문제의 설정
- 레벨: ${level}
- 주제: ${topic}
- 지문 길이: ${passageLen}
- 스타일: ${style}
- 정답 카드: ${slotCount}장
- 오답 카드: 1~2장 (정답 카드와 합쳐 총 ${slotCount + 1}~${slotCount + 2}장)
- 힌트: ${hintCount}개${hintCount === 0 ? ' (빈 배열)' : ''}

## 핵심 규칙

### passage (지문)
- 원문에서 핵심 논리를 추출하여 한국어로 재구성.
- 반드시 ${passageLen} 범위로 작성.
- 레벨이 높을수록 복합 문장, 전문 용어, 다층 논증을 사용.

### conclusion (결론) — 중요
- 결론은 지문에 직접 등장하지 않는 문장이어야 합니다.
- 지문의 내용을 종합하여 논리적으로 추론할 수 있는 명제를 작성하세요.
- 즉, 지문을 읽고 추론 카드를 올바르게 배열하면 도달할 수 있는 결론입니다.
- 지문의 문장을 그대로 복사하거나 요약하는 것은 금지합니다.

### sentences (보기 카드)
- 정답 카드 ${slotCount}장: 각 카드는 인과 관계의 한 단계. 올바른 순서로 배열하면 결론에 도달.
- 오답 카드 1~2장: 그럴듯하지만 논리적 인과에 맞지 않는 내용. 학생이 구별해야 하는 함정.
- id는 알파벳 순서 (a, b, c, d, ...).

### correct_chain (정답 순서)
- 정답 카드의 id를 인과 순서대로 배열.

### hints (힌트)
${hintCount > 0 ? `- ${hintCount}개 작성. level 1이 가장 추상적 힌트, 숫자가 클수록 구체적.` : '- 이 레벨은 힌트 없음 — hints를 빈 배열 []로.'}

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
    "correct_chain": ["a", "b", "c"${slotCount > 3 ? ', ...' : ''}],
    "hints": [${hintCount > 0 ? '{"level": 1, "text": "..."}, ...' : ''}]
  }
]

## 입력 텍스트
${text.slice(0, 15000)}`

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

    const questions = JSON.parse(jsonStr)

    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'AI가 올바른 형식의 문제를 생성하지 못했습니다.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ questions })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[generate-questions] AI generation failed:', message)
    return NextResponse.json(
      { error: `문제 생성 실패: ${message}` },
      { status: 500 },
    )
  }
}
