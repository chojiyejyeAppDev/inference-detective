import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const LEVEL_GUIDE = `
레벨별 난이도 기준:
| 레벨 | 슬롯(카드)수 | 힌트 유형 | 소재 |
|------|-------------|-----------|------|
| 1 | 3 | 직접 | 일상/기초 인과 |
| 2 | 3 | 직접 | 부분 추상 개념 |
| 3 | 4 | 반직접 | 수식어/종속절 포함 |
| 4 | 4 | 반직접 | 모의고사 수준 |
| 5 | 5 | 간접 | 대조/역전 논리 |
| 6 | 6 | 간접 | 수능 실전 |
| 7 | 7 | 없음 | 고난도 추상 |

- 슬롯 수 = 정답 카드 수. 오답 카드는 1~2개 추가.
- 예: 레벨 3이면 정답 4장 + 오답 1~2장 = 총 5~6장 보기 카드.
- 힌트는 레벨 1~4는 3개, 레벨 5~6은 1개, 레벨 7은 0개.
`

export async function POST(request: Request) {
  // Auth check: admin only
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

  const body = await request.json()
  const { text, level, topic, count = 3 } = body as {
    text: string
    level: number
    topic: string
    count?: number
  }

  if (!text || !level || !topic) {
    return NextResponse.json(
      { error: '지문 텍스트, 레벨, 주제를 모두 입력해주세요.' },
      { status: 400 },
    )
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
      { status: 500 },
    )
  }

  const openai = new OpenAI({ apiKey })

  // Determine slot count and hint count from level
  const slotCount = level <= 2 ? 3 : level <= 4 ? 4 : level <= 5 ? 5 : level <= 6 ? 6 : 7
  const hintCount = level <= 4 ? 3 : level <= 6 ? 1 : 0

  const clampedCount = Math.min(Math.max(count, 1), 10)

  const prompt = `당신은 수능 비문학 추론 문제 전문 출제자입니다.

아래 텍스트를 읽고, 이 내용에서 인과 관계 추론 문제를 ${clampedCount}개 만들어주세요.

${LEVEL_GUIDE}

지금 만들 문제의 설정:
- 레벨: ${level} (정답 카드 ${slotCount}장)
- 주제: ${topic}
- 힌트 개수: ${hintCount}

## 규칙
1. passage: 원문 텍스트에서 핵심 논리를 추출하여 3~7문장 지문으로 재구성. 학생이 이해할 수 있는 한국어로.
2. sentences: 정답 카드 ${slotCount}장 + 오답 카드 1~2장. 각 카드의 id는 알파벳 순서 (a, b, c, d, ...).
   - 정답 카드들은 논리적 인과 순서로 배열.
   - 오답 카드는 그럴듯하지만 논리적으로 맞지 않는 내용.
3. conclusion: 지문의 결론을 한 문장으로.
4. correct_chain: 정답 카드들의 id를 인과 순서대로 배열.
5. hints: ${hintCount}개의 힌트. level 1이 가장 쉬운 힌트, 숫자가 클수록 구체적.
${hintCount === 0 ? '(이 레벨은 힌트 없음 — hints를 빈 배열로)' : ''}

## 출력 형식
반드시 JSON 배열만 출력하세요. 마크다운이나 설명 없이 순수 JSON만.

[
  {
    "difficulty_level": ${level},
    "topic": "${topic}",
    "passage": "...",
    "sentences": [
      {"id": "a", "text": "..."},
      {"id": "b", "text": "..."},
      ...
    ],
    "conclusion": "...",
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

    // Extract JSON from response (handle markdown code blocks)
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
