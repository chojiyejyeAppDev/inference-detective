/**
 * 논문 지식 기반 문제 자동 생성
 *
 * GitHub Actions cron에서 매시간 호출됩니다.
 * reading/ 폴더의 논문을 배경 지식으로 활용하고,
 * DB의 기존 문제를 참조하여 중복 없는 새 문제를 생성합니다.
 *
 * 사용법:
 *   npx tsx scripts/generate-auto.ts [옵션]
 *
 * 옵션:
 *   --level N      특정 레벨만 (1-7)
 *   --level N-M    레벨 범위
 *   --count N      레벨당 문제 수 (기본: 2)
 *   --topic T      특정 토픽만 (humanities/social/science/tech/arts)
 *   --dry-run      DB 저장 없이 미리보기
 *
 * 환경변수:
 *   ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase 환경변수가 필요합니다.')
  process.exit(1)
}

// ── 타입 ──────────────────────────────────────────────
type Topic = 'humanities' | 'social' | 'science' | 'tech' | 'arts'

interface GeneratedQuestion {
  difficulty_level: number
  topic: Topic
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

interface ExistingQuestion {
  conclusion: string
  passage: string
}

// ── 레벨 설정 ─────────────────────────────────────────
interface LevelSpec {
  level: number
  slots: number
  hint_type: 'direct' | 'semi' | 'indirect' | 'none'
  description: string
  passage_guide: string
  sentence_guide: string
}

const LEVEL_SPECS: LevelSpec[] = [
  { level: 1, slots: 3, hint_type: 'direct', description: '기본 인과관계, 명확한 논리 흐름', passage_guide: '8-12문장. 일상적 언어로 명확한 인과관계를 전개.', sentence_guide: '정답 카드 3개 + 오답 카드 1개.' },
  { level: 2, slots: 3, hint_type: 'semi', description: '추상 개념 포함, 수식어/종속절 문장', passage_guide: '10-14문장. 학술적 개념을 포함하되 설명을 곁들임.', sentence_guide: '정답 카드 3개 + 오답 카드 1-2개.' },
  { level: 3, slots: 4, hint_type: 'semi', description: '복합 논증, 대조/역전 논리', passage_guide: '12-16문장. 대조, 반론, 재반론 구조 포함.', sentence_guide: '정답 카드 4개 + 오답 카드 1-2개.' },
  { level: 4, slots: 4, hint_type: 'indirect', description: '수능 실전 수준, 긴 지문', passage_guide: '14-18문장. 수능 비문학 수준. 복합적 논증 구조.', sentence_guide: '정답 카드 4개 + 오답 카드 2개.' },
  { level: 5, slots: 5, hint_type: 'indirect', description: '복잡한 논리 구조, 대조/역전', passage_guide: '14-18문장. 대조, 역전, 다층 논증 포함.', sentence_guide: '정답 카드 5개 + 오답 카드 2개.' },
  { level: 6, slots: 5, hint_type: 'indirect', description: '심화 수준, 다층 논증', passage_guide: '16-20문장. 수능 고난도 수준.', sentence_guide: '정답 카드 5개 + 오답 카드 2-3개.' },
  { level: 7, slots: 5, hint_type: 'none', description: '논문급 고난도 지문, 힌트 없음', passage_guide: '16-20문장. 논문 원문에 가까운 학술 문체.', sentence_guide: '정답 카드 5개 + 오답 카드 2-3개.' },
]

const ALL_TOPICS: Topic[] = ['humanities', 'social', 'science', 'tech', 'arts']

// ── 논문 지식 로딩 ────────────────────────────────────
interface PaperKnowledge {
  fileName: string
  language: 'ko' | 'en' | 'other'
  excerpt: string // 요약 발췌 (프롬프트 크기 제한용)
}

function detectLanguage(text: string): 'ko' | 'en' | 'other' {
  const sample = text.slice(0, 2000)
  const koreanChars = (sample.match(/[\uAC00-\uD7A3]/g) || []).length
  const asciiChars = (sample.match(/[a-zA-Z]/g) || []).length
  const total = koreanChars + asciiChars
  if (total === 0) return 'other'
  if (koreanChars / total > 0.3) return 'ko'
  if (asciiChars / total > 0.5) return 'en'
  return 'other'
}

async function readFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath)
    const { text } = await pdfParse(buffer)
    return text
  }

  // .txt, .md 등 텍스트 파일
  return fs.readFileSync(filePath, 'utf-8')
}

function extractExcerpt(content: string, maxLen: number): string {
  if (content.length <= maxLen) return content

  // 앞 40% (서론) + 뒤 30% (결론) + 중간 30% (랜덤)
  const frontSize = Math.floor(maxLen * 0.4)
  const backSize = Math.floor(maxLen * 0.3)
  const midSize = maxLen - frontSize - backSize
  const midStart = Math.floor(
    frontSize + Math.random() * (content.length - frontSize - backSize - midSize),
  )

  return [
    content.slice(0, frontSize),
    '\n[...중략...]\n',
    content.slice(midStart, midStart + midSize),
    '\n[...중략...]\n',
    content.slice(-backSize),
  ].join('')
}

async function loadPaperKnowledge(): Promise<PaperKnowledge[]> {
  const readingDir = path.resolve(__dirname, '..', 'reading')
  if (!fs.existsSync(readingDir)) {
    console.log('📂 reading/ 폴더가 없습니다. 소재 뱅크만 사용합니다.')
    return []
  }

  const SUPPORTED_EXTS = ['.pdf', '.txt', '.md']
  const files = fs.readdirSync(readingDir).filter((f) =>
    SUPPORTED_EXTS.includes(path.extname(f).toLowerCase()),
  )

  if (files.length === 0) {
    console.log('📂 reading/ 폴더에 지원되는 파일이 없습니다.')
    return []
  }

  const papers: PaperKnowledge[] = []
  const maxExcerptPerPaper = Math.floor(30000 / files.length)

  for (const file of files) {
    const filePath = path.join(readingDir, file)
    try {
      const content = await readFileContent(filePath)

      if (content.length < 200) {
        console.warn(`  ⚠️  ${file}: 내용이 너무 짧습니다 (${content.length}자). 건너뜁니다.`)
        continue
      }

      const language = detectLanguage(content)
      const excerpt = extractExcerpt(content, maxExcerptPerPaper)

      papers.push({
        fileName: path.basename(file, path.extname(file)),
        language,
        excerpt,
      })

      const langLabel = { ko: '한국어', en: '영어', other: '기타' }[language]
      const ext = path.extname(file).toUpperCase().slice(1)
      console.log(`  📄 ${file} [${ext}] (${langLabel}, ${content.length}자 → ${excerpt.length}자 발췌)`)
    } catch (err) {
      console.error(`  ❌ ${file} 읽기 실패:`, err instanceof Error ? err.message : err)
    }
  }

  return papers
}

// ── 토픽별 소재 뱅크 ──────────────────────────────────
const TOPIC_THEMES: Record<Topic, string[]> = {
  humanities: [
    '플라톤의 이데아론과 현실 세계의 관계',
    '동양과 서양의 인간관 비교',
    '언어의 자의성과 기호학적 해석',
    '실존주의에서 자유와 책임의 의미',
    '해석학적 순환과 텍스트 이해의 구조',
    '기억의 철학적 본질과 정체성',
    '미메시스 이론과 예술적 재현의 한계',
    '유교 윤리에서 인(仁)의 다층적 의미',
    '비트겐슈타인의 언어 게임 이론',
    '롤스의 정의론과 무지의 베일',
    '푸코의 권력-지식 관계론',
    '동아시아 불교의 공(空) 사상과 서양 허무주의 비교',
    '하이데거의 존재와 시간에서 현존재 분석',
    '데리다의 해체론과 로고스중심주의 비판',
    '장자의 소요유와 정신적 자유의 의미',
  ],
  social: [
    '행동경제학에서 손실 회피 편향의 의사결정 영향',
    '사회적 자본과 공동체 신뢰의 관계',
    '도시 젠트리피케이션의 사회경제적 메커니즘',
    '디지털 격차가 사회 불평등에 미치는 구조적 영향',
    '공유경제의 확산과 전통 시장 구조의 변화',
    '국제 무역에서 비교우위론의 현대적 적용',
    '중앙은행의 통화정책과 인플레이션 관리',
    '선거제도가 정당 체계에 미치는 영향 (뒤베르제의 법칙)',
    '사회 이동성과 교육 기회의 상관관계',
    '글로벌 공급망의 취약성과 리쇼어링 현상',
    '넛지 이론과 공공정책에서의 선택 설계',
    '기본소득 도입의 경제적 효과와 노동 시장 변화',
    '팬데믹 이후 원격 근무의 사회적 영향',
    '피케티의 자본 수익률과 경제적 불평등',
    '게임 이론에서 죄수의 딜레마와 협력의 진화',
  ],
  science: [
    'CRISPR 유전자 가위의 작동 원리와 윤리적 쟁점',
    '양자 얽힘과 비국소성의 물리학적 함의',
    '장내 미생물군과 면역 체계의 상호작용',
    '판구조론과 대륙 이동의 지질학적 증거',
    '후성유전학: 유전자 발현의 환경적 조절',
    '블랙홀 정보 역설과 호킹 복사',
    '광합성의 양자 효율성과 에너지 전달 메커니즘',
    '뇌의 신경가소성과 학습의 생물학적 기반',
    '암세포의 면역 회피 전략과 면역항암제의 원리',
    '엔트로피 증가와 시간의 방향성',
    '미토콘드리아의 진화적 기원과 세포 공생 이론',
    'RNA 간섭 현상과 유전자 침묵의 메커니즘',
    '기후 변화의 되먹임 루프와 티핑 포인트',
    '프리온 질병의 분자 메커니즘과 단백질 접힘',
    '중력파 검출과 일반상대성이론의 검증',
  ],
  tech: [
    '트랜스포머 아키텍처와 어텐션 메커니즘의 혁신',
    '블록체인의 합의 알고리즘과 탈중앙화의 트레이드오프',
    '자율주행 차량의 인지-판단-제어 시스템',
    '차분 프라이버시와 데이터 보호의 수학적 보장',
    '양자 컴퓨터의 큐비트와 양자 우위',
    '연합학습: 데이터를 공유하지 않는 분산 머신러닝',
    '엣지 컴퓨팅과 IoT에서의 실시간 데이터 처리',
    '대규모 언어 모델의 환각(hallucination) 문제와 해결 접근',
    '제로 트러스트 보안 아키텍처의 원리',
    'mRNA 백신 기술의 플랫폼화와 신약 개발',
    '디지털 트윈 기술과 산업 시뮬레이션',
    '반도체 미세 공정의 물리적 한계와 극복 전략',
    '강화학습에서 보상 함수 설계와 정렬 문제',
    'WebAssembly와 브라우저 기반 고성능 컴퓨팅',
    '합성 데이터와 AI 학습에서의 데이터 증강 전략',
  ],
  arts: [
    '바우하우스 운동의 예술·기술 통합 철학',
    '영화 몽타주 이론: 에이젠슈타인 vs 바쟁',
    '현대 건축에서 해체주의의 공간 해석',
    '음악에서 불협화음의 미학적 기능 변화',
    '디지털 아트와 원본성(aura)의 문제',
    '일본 와비사비 미학과 불완전의 아름다움',
    '한국 판소리의 서사 구조와 관객 참여의 역학',
    '포스트모던 문학에서 메타픽션의 서사 전략',
    '사진과 회화의 경계: 하이퍼리얼리즘의 도전',
    '게임 디자인에서 내러티브와 상호작용의 균형',
    '무용에서 신체 언어와 감정 전달의 메커니즘',
    '르네상스 원근법의 발명과 시각 혁명',
    '앤디 워홀과 팝아트의 대량생산 미학',
    '한국 전통 색채 오방색의 상징 체계',
    '알고리즘 작곡과 인공지능의 창작 가능성',
  ],
}

// ── CLI 인자 파싱 ─────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2)
  let levelMin = 1
  let levelMax = 7
  let count = 2
  let topic: Topic | undefined
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
      count = Math.max(1, Math.min(10, Number(args[i + 1])))
    }
    if (args[i] === '--topic' && args[i + 1]) {
      topic = args[i + 1] as Topic
    }
    if (args[i] === '--dry-run') {
      dryRun = true
    }
  }

  return { levelMin, levelMax, count, topic, dryRun }
}

// ── DB 기존 문제 조회 ─────────────────────────────────
async function fetchExistingQuestions(
  level: number,
  topic?: Topic,
): Promise<ExistingQuestion[]> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)

  let query = supabase
    .from('questions')
    .select('conclusion, passage')
    .eq('difficulty_level', level)

  if (topic) {
    query = query.eq('topic', topic)
  }

  const { data, error } = await query.limit(200)
  if (error) {
    console.warn(`  ⚠️  기존 문제 조회 실패 (L${level}): ${error.message}`)
    return []
  }
  return (data || []) as ExistingQuestion[]
}

// ── 유사도 체크 ───────────────────────────────────────
function tokenize(text: string): Set<string> {
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

function isDuplicate(q: GeneratedQuestion, existing: ExistingQuestion[]): boolean {
  for (const eq of existing) {
    if (jaccardSimilarity(q.conclusion, eq.conclusion) > 0.55) return true
    if (jaccardSimilarity(q.passage, eq.passage) > 0.45) return true
  }
  return false
}

// ── 소재 선택 (기존 문제와 겹치지 않도록) ─────────────
function pickTheme(topic: Topic, existingConclusions: string[]): string {
  const themes = TOPIC_THEMES[topic]
  // 기존 결론과 가장 덜 겹치는 소재 선택
  const scored = themes.map((theme) => {
    const maxSim = existingConclusions.reduce((max, c) => {
      return Math.max(max, jaccardSimilarity(theme, c))
    }, 0)
    return { theme, similarity: maxSim }
  })
  // 유사도가 낮은 순으로 정렬 후 상위에서 랜덤 선택
  scored.sort((a, b) => a.similarity - b.similarity)
  const topCandidates = scored.slice(0, Math.max(3, Math.floor(scored.length / 2)))
  return topCandidates[Math.floor(Math.random() * topCandidates.length)].theme
}

// ── 프롬프트 생성 ─────────────────────────────────────
function buildPrompt(
  levelSpec: LevelSpec,
  topic: Topic,
  theme: string,
  count: number,
  existingConclusions: string[],
  papers: PaperKnowledge[],
): string {
  const topicLabel: Record<Topic, string> = {
    humanities: '인문학',
    social: '사회과학',
    science: '자연과학',
    tech: '기술·공학',
    arts: '예술',
  }

  const deduplicationBlock = existingConclusions.length > 0
    ? `
## 🚫 중복 방지 (반드시 준수)
아래는 이미 DB에 존재하는 문제의 결론입니다. **이 결론과 동일하거나 유사한 문제를 절대 만들지 마세요.**
같은 논리 구조를 다른 표현으로 바꾼 것도 중복입니다. 완전히 새로운 논점으로 출제하세요.

### 기존 결론 (${existingConclusions.length}개):
${existingConclusions.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`
    : ''

  // 논문 지식 블록
  const knowledgeBlock = papers.length > 0
    ? `
## 📚 참고 논문 지식
아래는 문제 출제의 배경 지식으로 활용할 논문 발췌입니다.
이 지식을 바탕으로 **학술적으로 정확한** 지문과 논증 체인을 구성하세요.
논문 내용을 직접 인용하지 말고, 핵심 개념·논리 구조·학술적 깊이를 참고하세요.
${papers.map((p) => `영어 논문은 반드시 자연스러운 한국어로 재구성하세요. 직역 금지.

### ${p.fileName} (${p.language === 'en' ? '영어 → 한국어 변환 필요' : '한국어'})
${p.excerpt.slice(0, Math.floor(p.excerpt.length))}
`).join('\n')}`
    : ''

  return `당신은 대한민국 수능 비문학 추론 문제를 출제하는 최고 전문가입니다.

## 출제 지시
**소재**: "${theme}"
**토픽**: ${topicLabel[topic]} (${topic})
**레벨**: ${levelSpec.level} (${levelSpec.description})
**문제 수**: ${count}개

이 소재에 대해 깊이 있는 지식${papers.length > 0 ? '과 아래 제공된 논문 내용' : ''}을 활용하여 수능 비문학 수준의 추론 문제를 만드세요.

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
${deduplicationBlock}

## 지문 작성 기준
- **문체**: 수능 국어 비문학 지문 수준의 격식체 ("~이다", "~한다", "~된다" 체)
- **내용의 정확성**: 해당 분야의 실제 학술 지식에 기반하여 사실적으로 서술. 허위 정보 금지.
- **깊이**: 표면적 설명이 아닌, 개념 간 인과관계·대비·전제-결론 구조가 드러나도록 구성.
- **자기 완결성**: 지문만 읽고도 문제를 풀 수 있어야 함. 외부 지식 불필요.

## 다양성 지시
- 각 문제는 소재의 **서로 다른 측면**에서 출제하세요.
- 같은 논리 구조(A→B→C)를 반복하지 마세요.
- 문제마다 다른 논증 유형을 사용하세요: 인과, 대조, 유추, 조건, 반례, 귀류 등.

## 출력 형식
JSON 배열로 정확히 ${count}개의 문제를 출력하세요. 코드블록 없이 순수 JSON만 출력하세요.

각 문제 객체:
{
  "difficulty_level": ${levelSpec.level},
  "topic": "${topic}",
  "passage": "지문",
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
  "source": "자동 생성",
  "source_url": ""
}

## 품질 기준
1. **지문은 충분히 길어야 합니다** — 최소 ${levelSpec.passage_guide.split('.')[0].replace(/[^0-9-]/g, '').split('-')[0]}문장
2. **각 카드 문장은 20-60자** — 너무 짧거나 길지 않게
3. **오답 카드는 그럴듯해야 합니다** — 지문에 등장하는 내용이지만 논리 체인에 불필요한 것
4. **정답 체인의 논리 흐름이 자연스러워야 합니다** — 각 단계가 이전 단계에서 필연적으로 이어져야 함
5. **detailed_explanation은 학생이 '아!'하고 이해할 수 있어야 합니다**
6. **학술적 정확성** — 실제 학문 내용에 기반. 사실과 다른 내용 금지.
${knowledgeBlock}`
}

// ── 문제 유효성 검사 ──────────────────────────────────
function validateQuestion(q: GeneratedQuestion, spec: LevelSpec): boolean {
  const errors: string[] = []

  if (q.difficulty_level !== spec.level) {
    errors.push(`difficulty_level이 ${q.difficulty_level}인데 ${spec.level}이어야 합니다`)
  }
  if (!ALL_TOPICS.includes(q.topic)) {
    errors.push(`topic "${q.topic}"이 유효하지 않습니다`)
  }
  if (!q.passage || q.passage.length < 100) {
    errors.push(`passage가 너무 짧습니다 (${q.passage?.length || 0}자)`)
  }
  if (!Array.isArray(q.sentences) || q.sentences.length < spec.slots + 1) {
    errors.push(`sentences가 ${q.sentences?.length || 0}개인데 최소 ${spec.slots + 1}개 필요`)
  }
  if (!Array.isArray(q.correct_chain) || q.correct_chain.length !== spec.slots) {
    errors.push(`correct_chain이 ${q.correct_chain?.length || 0}개인데 ${spec.slots}개여야 합니다`)
  }
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

// ── Claude API 호출 ───────────────────────────────────
async function generateQuestions(
  client: Anthropic,
  levelSpec: LevelSpec,
  topic: Topic,
  count: number,
  existing: ExistingQuestion[],
  papers: PaperKnowledge[],
): Promise<GeneratedQuestion[]> {
  const existingConclusions = existing.map((q) => q.conclusion)
  const theme = pickTheme(topic, existingConclusions)

  const requestCount = Math.min(count + 2, 10) // 여유분

  const prompt = buildPrompt(levelSpec, topic, theme, requestCount, existingConclusions, papers)

  console.log(`  🎯 소재: "${theme}"`)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  let jsonStr = text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  let questions: GeneratedQuestion[]
  try {
    questions = JSON.parse(jsonStr)
  } catch {
    console.error('  ❌ JSON 파싱 실패')
    console.error(text.slice(0, 300))
    return []
  }

  if (!Array.isArray(questions)) {
    console.error('  ❌ 응답이 배열이 아닙니다')
    return []
  }

  // 유효성 검사 + 중복 필터링
  const valid = questions.filter((q) => validateQuestion(q, levelSpec))
  const unique: GeneratedQuestion[] = []
  const allExisting = [...existing]

  for (const q of valid) {
    if (isDuplicate(q, allExisting)) {
      console.warn(`  ♻️  중복 제외: "${q.conclusion.slice(0, 40)}..."`)
      continue
    }
    unique.push(q)
    allExisting.push({ conclusion: q.conclusion, passage: q.passage })
  }

  return unique.slice(0, count)
}

// ── 복구용 JSON 덤프 ─────────────────────────────────
function dumpForRecovery(questions: GeneratedQuestion[]): void {
  if (questions.length === 0) return

  // 로그에 복구용 JSON 출력 (GitHub Actions 로그에서 복사 가능)
  console.log('\n📦 [RECOVERY_DUMP_START]')
  console.log(JSON.stringify(questions))
  console.log('[RECOVERY_DUMP_END]')

  // 로컬 실행 시 파일로도 저장
  const dumpDir = path.resolve(__dirname, '..', '.question-dumps')
  try {
    if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const dumpPath = path.join(dumpDir, `questions-${timestamp}.json`)
    fs.writeFileSync(dumpPath, JSON.stringify(questions, null, 2), 'utf-8')
    console.log(`  💾 복구 파일 저장: ${dumpPath}`)
  } catch {
    // CI 환경에서 쓰기 실패해도 로그 덤프가 있으므로 무시
  }
}

// ── Supabase 저장 ─────────────────────────────────────
async function saveToSupabase(questions: GeneratedQuestion[]): Promise<number> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)
  let saved = 0
  const failed: GeneratedQuestion[] = []

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
      failed.push(q)
    } else {
      saved++
    }
  }

  // 저장 실패한 문제가 있으면 복구용 덤프
  if (failed.length > 0) {
    console.error(`\n⚠️  ${failed.length}개 문제 저장 실패 — 복구용 덤프 생성`)
    dumpForRecovery(failed)
  }

  return saved
}

// ── 메인 ──────────────────────────────────────────────
async function main() {
  const { levelMin, levelMax, count, topic, dryRun } = parseArgs()

  console.log('═══════════════════════════════════════════')
  console.log('  이:르다 — 자동 문제 생성 (논문 없음)')
  console.log('═══════════════════════════════════════════')
  console.log(`📊 레벨: ${levelMin}-${levelMax}`)
  console.log(`📝 레벨당 ${count}문제`)
  if (topic) console.log(`🏷️  토픽: ${topic}`)
  if (dryRun) console.log('🔍 Dry run 모드 (DB 저장 없음)')

  // 논문 지식 로딩
  console.log('\n📚 논문 지식 로딩...')
  const papers = await loadPaperKnowledge()
  if (papers.length > 0) {
    console.log(`  → ${papers.length}개 논문을 배경 지식으로 활용합니다`)
  } else {
    console.log('  → 논문 없이 소재 뱅크 기반으로 생성합니다')
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  const allQuestions: GeneratedQuestion[] = []

  for (let level = levelMin; level <= levelMax; level++) {
    const spec = LEVEL_SPECS[level - 1]

    // 토픽이 지정되지 않았으면 랜덤으로 하나 선택
    const targetTopic = topic || ALL_TOPICS[Math.floor(Math.random() * ALL_TOPICS.length)]

    console.log(`\n🤖 레벨 ${level} (${spec.description}) — 토픽: ${targetTopic}`)

    const existing = await fetchExistingQuestions(level, targetTopic)
    if (existing.length > 0) {
      console.log(`  📋 기존 문제: ${existing.length}개`)
    }

    const questions = await generateQuestions(client, spec, targetTopic, count, existing, papers)
    console.log(`  ✅ ${questions.length}/${count}문제 생성 성공`)
    allQuestions.push(...questions)
  }

  console.log(`\n═══ 총 ${allQuestions.length}문제 생성 완료 ═══`)

  if (dryRun) {
    console.log('\n📋 생성된 문제 미리보기:\n')
    for (const q of allQuestions) {
      console.log(`─── L${q.difficulty_level} [${q.topic}] ───`)
      console.log(`지문: ${q.passage.slice(0, 80)}...`)
      console.log(`결론: ${q.conclusion}`)
      console.log(`카드: ${q.sentences.length}개 (정답 체인: ${q.correct_chain.join('→')})`)
      console.log()
    }
    return
  }

  // 저장 전 전체 덤프 (만약을 위해)
  dumpForRecovery(allQuestions)

  const saved = await saveToSupabase(allQuestions)
  console.log(`\n💾 Supabase 저장: ${saved}/${allQuestions.length}문제`)

  if (saved === allQuestions.length) {
    console.log('🎉 모든 문제가 성공적으로 저장되었습니다!')
  } else {
    console.log('⚠️  일부 문제 저장에 실패했습니다.')
  }
}

main().catch((err) => {
  console.error('❌ 실행 오류:', err)
  process.exit(1)
})
