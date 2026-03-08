/**
 * 논문 기반 문제 자동 생성 스크립트
 *
 * 사용법:
 *   npx tsx scripts/generate-from-paper.ts <논문파일경로> [옵션]
 *
 * 예시:
 *   npx tsx scripts/generate-from-paper.ts ./papers/인지과학.pdf --level 3 --count 5
 *   npx tsx scripts/generate-from-paper.ts ./papers/경제학.txt --level 1-5 --count 10
 *   npx tsx scripts/generate-from-paper.ts ./papers/논문.md
 *
 * 환경변수 (.env.local):
 *   ANTHROPIC_API_KEY          — Claude API 키
 *   NEXT_PUBLIC_SUPABASE_URL   — Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY  — Supabase 서비스 키
 *
 * 옵션:
 *   --level N      특정 레벨만 생성 (1-7)
 *   --level N-M    레벨 범위 지정
 *   --count N      생성할 문제 수 (기본: 5)
 *   --topic T      토픽 지정 (humanities/social/science/tech/arts)
 *   --dry-run      DB 저장 없이 결과만 출력
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import pdfParse from 'pdf-parse'

// ── 환경변수 ──────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY 환경변수가 필요합니다.')
  process.exit(1)
}

// ── 타입 정의 ─────────────────────────────────────────
interface GeneratedQuestion {
  difficulty_level: number
  topic: 'humanities' | 'social' | 'science' | 'tech' | 'arts'
  passage: string
  sentences: { id: string; text: string }[]
  conclusion: string
  correct_chain: string[]
  hints: { level: number; text: string }[]
  detailed_explanation: string
  wrong_answer_analysis: { sentence_id: string; why_wrong: string }[]
  chain_explanations: string[]
  source: string
  source_url: string
}

interface LevelSpec {
  level: number
  slots: number
  hint_type: 'direct' | 'semi' | 'indirect' | 'none'
  description: string
  passage_guide: string
  sentence_guide: string
}

const LEVEL_SPECS: LevelSpec[] = [
  {
    level: 1,
    slots: 3,
    hint_type: 'direct',
    description: '기본 인과관계, 명확한 논리 흐름',
    passage_guide: '8-12문장. 일상적 언어로 명확한 인과관계를 전개. 접속어(따라서, 왜냐하면)를 명시적으로 사용.',
    sentence_guide: '정답 카드 3개 + 오답 카드 1개. 오답은 주제와 관련되지만 논리 체인에 불필요한 것.',
  },
  {
    level: 2,
    slots: 3,
    hint_type: 'semi',
    description: '추상 개념 포함, 수식어/종속절 문장',
    passage_guide: '10-14문장. 학술적 개념을 포함하되 설명을 곁들임. 논리 흐름이 2단계 이상 깊어짐.',
    sentence_guide: '정답 카드 3개 + 오답 카드 1-2개. 오답은 지문에 언급되지만 핵심 논증에서 벗어난 것.',
  },
  {
    level: 3,
    slots: 4,
    hint_type: 'semi',
    description: '복합 논증, 대조/역전 논리',
    passage_guide: '12-16문장. 대조, 반론, 재반론 구조 포함. 전문 용어를 사용하되 맥락에서 유추 가능.',
    sentence_guide: '정답 카드 4개 + 오답 카드 1-2개. 오답은 지문의 부수적 정보이거나 과잉 일반화.',
  },
  {
    level: 4,
    slots: 4,
    hint_type: 'indirect',
    description: '수능 실전 수준, 긴 지문',
    passage_guide: '14-18문장. 수능 비문학 수준. 복합적 논증 구조. 암묵적 전제와 함축적 결론 포함.',
    sentence_guide: '정답 카드 4개 + 오답 카드 2개. 오답은 그럴듯하지만 논리적 비약이 있는 것.',
  },
  {
    level: 5,
    slots: 5,
    hint_type: 'indirect',
    description: '복잡한 논리 구조, 대조/역전',
    passage_guide: '14-18문장. 대조, 역전, 다층 논증 포함. 암묵적 전제와 함축적 결론.',
    sentence_guide: '정답 카드 5개 + 오답 카드 2개. 오답은 그럴듯하지만 논리적 비약이 있는 것.',
  },
  {
    level: 6,
    slots: 5,
    hint_type: 'indirect',
    description: '심화 수준, 다층 논증',
    passage_guide: '16-20문장. 수능 고난도 수준. 복합 논증, 반례 검토, 전제-결론 구분이 어려운 구조.',
    sentence_guide: '정답 카드 5개 + 오답 카드 2-3개. 오답은 논리적으로 정교하여 구분이 어려운 것.',
  },
  {
    level: 7,
    slots: 5,
    hint_type: 'none',
    description: '논문급 고난도 지문, 힌트 없음',
    passage_guide: '16-20문장. 논문 원문에 가까운 학술 문체. 다층 논증, 반례 검토, 메타 분석 포함.',
    sentence_guide: '정답 카드 5개 + 오답 카드 2-3개. 오답은 논리적으로 매우 정교하여 구분이 어려운 것.',
  },
]

// ── CLI 인자 파싱 ─────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2)
  const filePath = args.find((a) => !a.startsWith('--'))
  if (!filePath) {
    console.error('사용법: npx tsx scripts/generate-from-paper.ts <파일경로> [옵션]')
    process.exit(1)
  }

  let levelMin = 1
  let levelMax = 7
  let count = 5
  let topic: string | undefined
  let dryRun = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--level' && args[i + 1]) {
      const val = args[i + 1]
      if (val.includes('-')) {
        const [min, max] = val.split('-').map(Number)
        levelMin = Math.max(1, min)
        levelMax = Math.min(7, max)
      } else {
        levelMin = levelMax = Math.max(1, Math.min(7, Number(val)))
      }
    }
    if (args[i] === '--count' && args[i + 1]) {
      count = Math.max(1, Math.min(20, Number(args[i + 1])))
    }
    if (args[i] === '--topic' && args[i + 1]) {
      topic = args[i + 1]
    }
    if (args[i] === '--dry-run') {
      dryRun = true
    }
  }

  return { filePath, levelMin, levelMax, count, topic, dryRun }
}

// ── 파일 읽기 (PDF/TXT/MD 자동 감지) ─────────────────
async function readPaper(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${resolved}`)
    process.exit(1)
  }

  const ext = path.extname(resolved).toLowerCase()
  let content: string

  if (ext === '.pdf') {
    console.log('📑 PDF 파일을 텍스트로 변환 중...')
    const buffer = fs.readFileSync(resolved)
    const { text, numpages } = await pdfParse(buffer)
    console.log(`  → ${numpages}페이지, ${text.length}자 추출 완료`)
    content = text
  } else {
    content = fs.readFileSync(resolved, 'utf-8')
  }

  if (content.length < 200) {
    console.error('❌ 논문 내용이 너무 짧습니다 (최소 200자).')
    process.exit(1)
  }

  // 너무 긴 경우 앞부분만 사용 (Claude 컨텍스트 제한 고려)
  const maxChars = 80000
  if (content.length > maxChars) {
    console.log(`⚠️  논문이 ${content.length}자입니다. 앞 ${maxChars}자만 사용합니다.`)
    return content.slice(0, maxChars)
  }

  return content
}

// ── 언어 감지 ─────────────────────────────────────────
function detectLanguage(text: string): 'ko' | 'en' | 'other' {
  // 처음 2000자에서 한글 비율로 판단
  const sample = text.slice(0, 2000)
  const koreanChars = (sample.match(/[\uAC00-\uD7A3]/g) || []).length
  const asciiChars = (sample.match(/[a-zA-Z]/g) || []).length
  const total = koreanChars + asciiChars

  if (total === 0) return 'other'
  if (koreanChars / total > 0.3) return 'ko'
  if (asciiChars / total > 0.5) return 'en'
  return 'other'
}

// ── DB에서 기존 문제 결론 가져오기 (중복 방지용) ──────
interface ExistingQuestion {
  conclusion: string
  passage: string
}

async function fetchExistingQuestions(
  level: number,
  source?: string,
): Promise<ExistingQuestion[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return []

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // 같은 레벨 + 같은 출처의 기존 문제를 가져옴
  let query = supabase
    .from('questions')
    .select('conclusion, passage')
    .eq('difficulty_level', level)

  if (source) {
    query = query.eq('source', source)
  }

  const { data, error } = await query.limit(200)

  if (error) {
    console.warn(`  ⚠️  기존 문제 조회 실패 (L${level}): ${error.message}`)
    return []
  }

  return (data || []) as ExistingQuestion[]
}

// ── 유사도 체크 (자카드 유사도 기반) ──────────────────
function tokenize(text: string): Set<string> {
  // 2-gram으로 토큰화 (한국어/영어 모두 대응)
  const cleaned = text.replace(/\s+/g, '').toLowerCase()
  const tokens = new Set<string>()
  for (let i = 0; i < cleaned.length - 1; i++) {
    tokens.add(cleaned.slice(i, i + 2))
  }
  return tokens
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a)
  const setB = tokenize(b)
  if (setA.size === 0 || setB.size === 0) return 0

  let intersection = 0
  setA.forEach((token) => {
    if (setB.has(token)) intersection++
  })
  return intersection / (setA.size + setB.size - intersection)
}

function isDuplicate(
  newQuestion: GeneratedQuestion,
  existing: ExistingQuestion[],
): boolean {
  const CONCLUSION_THRESHOLD = 0.55
  const PASSAGE_THRESHOLD = 0.45

  for (const eq of existing) {
    // 결론이 매우 유사하면 중복
    if (jaccardSimilarity(newQuestion.conclusion, eq.conclusion) > CONCLUSION_THRESHOLD) {
      return true
    }
    // 지문이 유사하면 중복
    if (jaccardSimilarity(newQuestion.passage, eq.passage) > PASSAGE_THRESHOLD) {
      return true
    }
  }
  return false
}

// ── 프롬프트 생성 ─────────────────────────────────────
function buildPrompt(
  paperContent: string,
  levelSpec: LevelSpec,
  count: number,
  existingConclusions: string[],
  language: 'ko' | 'en' | 'other',
  topic?: string,
  sourceName?: string,
): string {
  const topicInstruction = topic
    ? `토픽은 반드시 "${topic}"으로 설정하세요.`
    : `토픽은 논문 내용에 따라 humanities, social, science, tech, arts 중 가장 적절한 것을 선택하세요.`

  // 언어별 번역 지시
  const translationInstruction = language === 'en'
    ? `
## 🌐 언어 지시 (매우 중요)
제공된 논문은 **영어**로 작성되어 있습니다. 그러나 모든 출력(지문, 카드, 결론, 힌트, 해설)은 반드시 **자연스러운 한국어**로 작성하세요.

번역 시 주의사항:
- **직역 금지** — 영어 논문의 논리와 개념을 이해한 뒤, 한국어 수능 비문학 문체로 **재구성**하세요.
- **문체 기준** — 대한민국 수능 국어 비문학 지문 수준의 격식체. "~이다", "~한다", "~된다" 체를 사용.
- **전문 용어** — 해당 분야에서 한국어로 통용되는 학술 용어를 사용하세요. 영어 원어가 더 자연스러운 경우 괄호 병기 가능 (예: "기질 특이성(substrate specificity)").
- **논리 접속어** — "따라서", "그러나", "이에 반해", "이로 인해" 등 한국어 학술 접속어를 자연스럽게 사용.
- 영어 문장 구조를 그대로 옮기지 마세요. 한국어 어순과 호흡에 맞게 재배열하세요.
`
    : language === 'other'
      ? `
## 🌐 언어 지시
논문이 한국어가 아닐 수 있습니다. 모든 출력은 반드시 **자연스러운 한국어**로 작성하세요. 수능 비문학 문체("~이다" 체)로 재구성하세요.
`
      : ''

  // 중복 방지 지시
  const deduplicationInstruction = existingConclusions.length > 0
    ? `
## 🚫 중복 방지 (반드시 준수)
아래는 이미 DB에 존재하는 문제의 결론입니다. **이 결론과 동일하거나 유사한 문제를 만들지 마세요.**
유사한 결론뿐 아니라, 같은 논리 구조를 다른 말로 바꾸기만 한 것도 중복입니다.
논문의 **다른 섹션, 다른 논점, 다른 실험 결과**에서 문제를 출제하세요.

### 기존 결론 목록 (${existingConclusions.length}개):
${existingConclusions.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`
    : ''

  return `당신은 수능 비문학 추론 문제를 출제하는 전문가입니다.

아래 논문/글을 읽고, 이 내용을 바탕으로 **레벨 ${levelSpec.level} (${levelSpec.description})** 수준의 추론 문제를 **${count}개** 만들어주세요.

## 게임 규칙
- 학생에게 **지문(passage)**과 **카드(sentences)**가 주어집니다
- 학생은 카드를 올바른 논리 순서대로 배치하여 **결론(conclusion)**에 도달하는 추론 체인을 만듭니다
- 정답 체인(correct_chain)은 정확히 **${levelSpec.slots}개** 카드로 구성됩니다
- 추가로 **오답 카드**도 포함하여 학생이 구분해야 합니다

## 레벨 ${levelSpec.level} 기준
- 난이도: ${levelSpec.description}
- 지문: ${levelSpec.passage_guide}
- 카드: ${levelSpec.sentence_guide}
- 힌트 유형: ${levelSpec.hint_type === 'direct' ? '직접적 (정답을 거의 알려주는 수준)' : levelSpec.hint_type === 'semi' ? '반간접적 (방향만 제시)' : levelSpec.hint_type === 'indirect' ? '간접적 (사고의 실마리만 제공)' : '힌트 없음'}

## ${topicInstruction}
${translationInstruction}
${deduplicationInstruction}

## 다양성 지시
- 각 문제는 논문의 **서로 다른 핵심 논점**에서 출제하세요.
- 같은 문제 내에서도 반복적인 표현을 피하세요.
- 가능하면 논문의 서론, 방법론, 결과, 논의 등 **다른 섹션**에서 골고루 출제하세요.
- 같은 개념을 다루더라도 **다른 각도**(원인→결과, 비교→대조, 정의→적용 등)로 접근하세요.

## 출력 형식
JSON 배열로 정확히 ${count}개의 문제를 출력하세요. 코드블록 없이 순수 JSON만 출력하세요.

각 문제 객체:
{
  "difficulty_level": ${levelSpec.level},
  "topic": "토픽",
  "passage": "지문 (${levelSpec.passage_guide.split('.')[0]})",
  "sentences": [
    {"id": "a", "text": "카드 텍스트"},
    {"id": "b", "text": "카드 텍스트"},
    ...
  ],
  "conclusion": "결론 문장",
  "correct_chain": ["a", "b", "c"${levelSpec.slots >= 4 ? ', "d"' : ''}${levelSpec.slots >= 5 ? ', "e"' : ''}],
  "hints": [
    ${levelSpec.hint_type !== 'none' ? `{"level": 1, "text": "힌트 1"},\n    {"level": 2, "text": "힌트 2"},\n    {"level": 3, "text": "힌트 3"}` : ''}
  ],
  "detailed_explanation": "왜 이 순서가 정답인지 3-5문장으로 상세 해설",
  "wrong_answer_analysis": [
    {"sentence_id": "오답카드id", "why_wrong": "이 카드가 왜 논리 체인에 포함되지 않는지 설명"}
  ],
  "chain_explanations": [
    "1단계가 왜 출발점인지",
    "2단계가 왜 1단계 다음에 오는지",
    ...
  ],
  "source": "${sourceName || '제공된 논문'}",
  "source_url": ""
}

## 품질 기준
1. **지문은 충분히 길어야 합니다** — 최소 ${levelSpec.passage_guide.split('.')[0].replace(/[^0-9-]/g, '').split('-')[0]}문장
2. **각 카드 문장은 20-60자** — 너무 짧거나 길지 않게
3. **오답 카드는 그럴듯해야 합니다** — 지문에 나오는 내용이지만 논리 체인에 불필요한 것
4. **정답 체인의 논리 흐름이 명확해야 합니다** — 각 단계가 이전 단계에서 자연스럽게 이어져야 함
5. **detailed_explanation은 학생이 읽고 '아!'하고 이해할 수 있어야 합니다**
6. **논문의 실제 내용을 충실히 반영하세요** — 임의로 지어내지 말 것
7. **모든 텍스트는 한국어로 작성** — 영어 논문이라도 한국어로 자연스럽게 재구성

## 논문 내용
${paperContent}`
}

// ── Claude API 호출 ───────────────────────────────────
async function generateQuestions(
  client: Anthropic,
  paperContent: string,
  levelSpec: LevelSpec,
  count: number,
  existingQuestions: ExistingQuestion[],
  language: 'ko' | 'en' | 'other',
  topic?: string,
  sourceName?: string,
): Promise<GeneratedQuestion[]> {
  const existingConclusions = existingQuestions.map((q) => q.conclusion)

  // 중복 가능성을 고려해 여유분 요청 (기존 문제가 많을수록 더 요청)
  const requestCount = existingConclusions.length > 10
    ? Math.min(count + 3, 20)
    : count

  const prompt = buildPrompt(
    paperContent,
    levelSpec,
    requestCount,
    existingConclusions,
    language,
    topic,
    sourceName,
  )

  console.log(`\n🤖 레벨 ${levelSpec.level} (${levelSpec.description}) — ${requestCount}문제 생성 중...`)
  if (language === 'en') console.log('  🌐 영어 논문 → 한국어 문제로 변환')
  if (existingConclusions.length > 0) {
    console.log(`  🚫 기존 ${existingConclusions.length}개 문제와 중복 체크`)
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  // JSON 파싱 (코드블록 래핑 대응)
  let jsonStr = text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  let questions: GeneratedQuestion[]
  try {
    questions = JSON.parse(jsonStr)
  } catch {
    console.error('❌ JSON 파싱 실패. Claude 응답:')
    console.error(text.slice(0, 500))
    return []
  }

  if (!Array.isArray(questions)) {
    console.error('❌ 응답이 배열이 아닙니다.')
    return []
  }

  // 유효성 검사
  const valid = questions.filter((q) => validateQuestion(q, levelSpec))

  // 코드 레벨 중복 필터링
  const unique: GeneratedQuestion[] = []
  // 기존 문제 + 이번에 통과한 문제를 합쳐서 중복 체크
  const allExisting = [...existingQuestions]

  for (const q of valid) {
    if (isDuplicate(q, allExisting)) {
      console.warn(`  ♻️  중복 제외: "${q.conclusion.slice(0, 40)}..."`)
      continue
    }
    unique.push(q)
    // 방금 추가한 문제도 이후 중복 체크 대상에 포함
    allExisting.push({ conclusion: q.conclusion, passage: q.passage })
  }

  // 요청한 수만큼만 반환
  return unique.slice(0, count)
}

// ── 문제 유효성 검사 ──────────────────────────────────
function validateQuestion(q: GeneratedQuestion, spec: LevelSpec): boolean {
  const errors: string[] = []

  if (q.difficulty_level !== spec.level) {
    errors.push(`difficulty_level이 ${q.difficulty_level}인데 ${spec.level}이어야 합니다`)
  }

  if (!['humanities', 'social', 'science', 'tech', 'arts'].includes(q.topic)) {
    errors.push(`topic "${q.topic}"이 유효하지 않습니다`)
  }

  if (!q.passage || q.passage.length < 100) {
    errors.push(`passage가 너무 짧습니다 (${q.passage?.length || 0}자)`)
  }

  // 영어 잔류 감지 — 지문에 영어가 과도하게 포함된 경우 경고
  const englishRatio = (q.passage.match(/[a-zA-Z]/g) || []).length / q.passage.length
  if (englishRatio > 0.3) {
    errors.push(`passage에 영어가 ${Math.round(englishRatio * 100)}% 포함됨 (번역 미흡)`)
  }

  if (!Array.isArray(q.sentences) || q.sentences.length < spec.slots + 1) {
    errors.push(`sentences가 ${q.sentences?.length || 0}개인데 최소 ${spec.slots + 1}개 필요`)
  }

  if (!Array.isArray(q.correct_chain) || q.correct_chain.length !== spec.slots) {
    errors.push(`correct_chain이 ${q.correct_chain?.length || 0}개인데 ${spec.slots}개여야 합니다`)
  }

  // correct_chain의 모든 ID가 sentences에 있는지
  const sentenceIds = new Set(q.sentences?.map((s) => s.id) || [])
  for (const id of q.correct_chain || []) {
    if (!sentenceIds.has(id)) {
      errors.push(`correct_chain의 "${id}"가 sentences에 없습니다`)
    }
  }

  if (!q.conclusion) {
    errors.push('conclusion이 비어있습니다')
  }

  if (spec.hint_type !== 'none' && (!Array.isArray(q.hints) || q.hints.length === 0)) {
    errors.push('힌트가 필요한 레벨인데 hints가 비어있습니다')
  }

  if (errors.length > 0) {
    console.warn(`  ⚠️  문제 제외 (${q.topic}): ${errors.join(', ')}`)
    return false
  }

  return true
}

// ── Supabase 저장 ─────────────────────────────────────
async function saveToSupabase(questions: GeneratedQuestion[]): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase 환경변수가 설정되지 않았습니다.')
    return 0
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  let saved = 0

  for (const q of questions) {
    const { error } = await supabase.from('questions').insert({
      difficulty_level: q.difficulty_level,
      topic: q.topic,
      passage: q.passage,
      sentences: q.sentences,
      conclusion: q.conclusion,
      correct_chain: q.correct_chain,
      hints: q.hints,
      detailed_explanation: q.detailed_explanation,
      wrong_answer_analysis: q.wrong_answer_analysis,
      chain_explanations: q.chain_explanations,
      source: q.source,
      source_url: q.source_url || null,
    })

    if (error) {
      console.error(`  ❌ 저장 실패 (${q.topic}, L${q.difficulty_level}): ${error.message}`)
    } else {
      saved++
    }
  }

  return saved
}

// ── 메인 ──────────────────────────────────────────────
async function main() {
  const { filePath, levelMin, levelMax, count, topic, dryRun } = parseArgs()

  console.log('═══════════════════════════════════════════')
  console.log('  이:르다 — 논문 기반 문제 자동 생성')
  console.log('═══════════════════════════════════════════')
  console.log(`📄 논문: ${filePath}`)
  console.log(`📊 레벨: ${levelMin}-${levelMax}`)
  console.log(`📝 레벨당 ${count}문제`)
  if (topic) console.log(`🏷️  토픽: ${topic}`)
  if (dryRun) console.log('🔍 Dry run 모드 (DB 저장 없음)')

  // 논문 읽기
  const paperContent = await readPaper(filePath)
  console.log(`\n📖 논문 로드 완료 (${paperContent.length}자)`)

  // 언어 감지
  const language = detectLanguage(paperContent)
  const langLabel = { ko: '한국어', en: '영어', other: '기타' }[language]
  console.log(`🌐 감지된 언어: ${langLabel}`)
  if (language === 'en') {
    console.log('  → 영어 논문을 한국어 수능 비문학 문체로 변환합니다')
  }

  const sourceName = path.basename(filePath, path.extname(filePath))

  // Claude 클라이언트
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  // 레벨별 생성
  const allQuestions: GeneratedQuestion[] = []

  for (let level = levelMin; level <= levelMax; level++) {
    const spec = LEVEL_SPECS[level - 1]

    // 기존 문제 가져오기 (중복 방지)
    const existing = await fetchExistingQuestions(level, sourceName)
    if (existing.length > 0) {
      console.log(`  📋 레벨 ${level} 기존 문제: ${existing.length}개`)
    }

    const questions = await generateQuestions(
      client, paperContent, spec, count, existing, language, topic, sourceName,
    )
    console.log(`  ✅ 레벨 ${level}: ${questions.length}/${count}문제 생성 성공`)
    allQuestions.push(...questions)
  }

  console.log(`\n═══ 총 ${allQuestions.length}문제 생성 완료 ═══`)

  // Dry run이면 출력만
  if (dryRun) {
    console.log('\n📋 생성된 문제 미리보기:\n')
    for (const q of allQuestions) {
      console.log(`─── L${q.difficulty_level} [${q.topic}] ───`)
      console.log(`지문: ${q.passage.slice(0, 80)}...`)
      console.log(`결론: ${q.conclusion}`)
      console.log(`카드: ${q.sentences.length}개 (정답 체인: ${q.correct_chain.join('→')})`)
      console.log(`해설: ${q.detailed_explanation?.slice(0, 60)}...`)
      console.log()
    }
    return
  }

  // DB 저장
  const saved = await saveToSupabase(allQuestions)
  console.log(`\n💾 Supabase 저장: ${saved}/${allQuestions.length}문제`)

  if (saved === allQuestions.length) {
    console.log('🎉 모든 문제가 성공적으로 저장되었습니다!')
  } else {
    console.log('⚠️  일부 문제 저장에 실패했습니다. 위 로그를 확인하세요.')
  }
}

main().catch((err) => {
  console.error('❌ 실행 오류:', err)
  process.exit(1)
})
