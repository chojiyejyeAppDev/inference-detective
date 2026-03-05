/**
 * Daily Question Generator for 이:르다
 *
 * Generates 10 propositions and conclusions for each of the 7 difficulty levels
 * (70 total) and seeds them into Supabase.
 *
 * Run manually:   npx tsx scripts/daily-question-generator.ts
 * Schedule:       Every day at 7:00 AM (cron: 0 7 * * *)
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ────────────────────────────────────────────────
// Type definitions
// ────────────────────────────────────────────────

type Topic = 'humanities' | 'social' | 'science' | 'tech' | 'arts'

interface Sentence {
  id: string
  text: string
}

interface Hint {
  level: number
  text: string
}

interface Question {
  difficulty_level: number
  topic: Topic
  passage: string
  sentences: Sentence[]
  conclusion: string
  correct_chain: string[]
  hints: Hint[]
}

// ────────────────────────────────────────────────
// Level configuration (mirrors lib/game/levelConfig.ts)
// ────────────────────────────────────────────────

const LEVEL_CONFIG: Record<number, { slots: number; hintType: 'direct' | 'semi' | 'indirect' | 'none'; desc: string }> = {
  1: { slots: 3, hintType: 'direct',   desc: '일상/기초 인과' },
  2: { slots: 3, hintType: 'direct',   desc: '부분 추상 개념' },
  3: { slots: 4, hintType: 'semi',     desc: '수식어/종속절 포함' },
  4: { slots: 4, hintType: 'semi',     desc: '모의고사 수준' },
  5: { slots: 5, hintType: 'indirect', desc: '대조/역전 논리' },
  6: { slots: 6, hintType: 'indirect', desc: '수능 실전' },
  7: { slots: 7, hintType: 'none',     desc: '고난도 추상' },
}

// ────────────────────────────────────────────────
// Topic pools — Korean 수능 비문학 themes
// ────────────────────────────────────────────────

const TOPIC_THEMES: Record<Topic, string[]> = {
  humanities: [
    '플라톤의 이데아론과 감각 세계의 관계',
    '칸트의 정언명령과 의무론적 윤리',
    '하이데거의 현존재와 존재론적 차이',
    '데리다의 해체론과 차연 개념',
    '비트겐슈타인의 언어 게임 이론',
    '니체의 위버멘쉬와 도덕 비판',
    '사르트르의 실존주의와 자유',
    '아리스토텔레스의 목적론',
    '헤겔의 변증법과 절대정신',
    '데카르트의 코기토와 방법적 회의',
    '홉스의 자연 상태와 리바이어던',
    '루소의 사회계약론과 일반의지',
    '흄의 경험론과 인과관계 비판',
    '존 롤스의 정의론과 무지의 베일',
    '스피노자의 범신론',
    '유교의 인과 예의 관계',
    '노자의 무위자연과 도',
    '공리주의와 최대 다수의 최대 행복',
    '현상학적 환원과 의식의 지향성',
    '구조주의 언어학과 소쉬르',
  ],
  social: [
    '수요와 공급의 균형 원리',
    '인플레이션과 통화정책',
    '비교우위론과 자유무역',
    '행동경제학과 전망이론',
    '케인스의 유효수요론',
    '제도경제학과 거래비용',
    '세계화의 빛과 그림자',
    '사회계약론의 세 갈래',
    '사회적 자본과 네트워크 효과',
    '민주주의의 다수결과 소수 보호',
    '시장 실패와 정부 개입',
    '공공재와 무임승차 문제',
    '노동시장의 구조와 임금 결정',
    '소득 불평등과 지니계수',
    '중앙은행의 독립성과 통화정책',
    '국제 수지와 환율 결정',
    '교육의 외부효과와 사회적 수익률',
    '도시화와 젠트리피케이션',
    '인구 고령화와 복지 재정',
    '디지털 경제와 플랫폼 독점',
  ],
  science: [
    '자연선택과 진화론의 발전',
    '면역 체계의 선천·적응 면역',
    '열역학 제2법칙과 엔트로피',
    '일반상대성이론과 시공간 곡률',
    '양자역학의 불확정성 원리',
    '광합성의 명반응과 암반응',
    'DNA 복제와 유전자 발현',
    '항생제 내성의 진화적 메커니즘',
    '뇌의 신경가소성과 학습',
    'CRISPR 유전자 편집 기술',
    '판구조론과 지질학적 변동',
    '기후변화의 과학적 기제',
    '바이러스의 변이와 팬데믹',
    '줄기세포의 분화와 재생의학',
    '생태계 에너지 흐름과 물질 순환',
    '블랙홀의 형성과 호킹 복사',
    '카오스 이론과 나비 효과',
    '미생물 군집과 인체 마이크로바이옴',
    '핵분열과 핵융합 에너지',
    '후성유전학과 환경의 유전적 영향',
  ],
  tech: [
    '블록체인의 합의 메커니즘',
    '머신러닝 과적합과 정규화',
    '대규모 언어 모델과 환각 현상',
    '양자 컴퓨팅의 큐비트와 오류 보정',
    'CAP 정리와 분산 시스템 설계',
    '제로 트러스트 보안 모델',
    '클라우드 컴퓨팅과 하이브리드 전략',
    '자율주행의 기술과 윤리',
    'AI 편향과 공정성 문제',
    '사물인터넷(IoT)과 엣지 컴퓨팅',
    '디지털 트윈과 시뮬레이션',
    '5G/6G 통신과 네트워크 슬라이싱',
    '사이버 보안과 제로데이 취약점',
    '강화학습과 의사결정 최적화',
    'DevOps와 CI/CD 파이프라인',
    '마이크로서비스 아키텍처의 장단점',
    '연합학습과 프라이버시 보존 AI',
    'WebAssembly와 브라우저 성능',
    '그래프 데이터베이스와 관계 분석',
    '생성형 AI의 저작권 쟁점',
  ],
  arts: [
    '인상주의의 빛과 색채 혁명',
    '소나타 형식과 고전주의 음악',
    '뒤샹의 레디메이드와 예술 정의',
    '브레히트의 서사극과 소외 효과',
    '바우하우스와 기능주의 디자인',
    '누벨바그의 영화적 실험',
    '존 케이지의 4분 33초와 침묵',
    '팝아트와 대중문화의 예술화',
    '미니멀리즘 조각과 공간 인식',
    '포스트모더니즘 건축의 장식 복원',
    '표현주의와 내면 감정의 시각화',
    '큐비즘과 다시점 해체',
    '초현실주의와 무의식의 탐구',
    '오페라와 총체예술(Gesamtkunstwerk)',
    '사진의 기계적 복제와 아우라',
    '추상표현주의와 액션 페인팅',
    '다다이즘의 반예술 선언',
    '일본 와비사비 미학과 불완전성',
    '디지털 아트와 NFT의 예술적 가치',
    '한국 판소리의 서사 구조',
  ],
}

// ────────────────────────────────────────────────
// Sentence ID labels (for up to 9 sentences)
// ────────────────────────────────────────────────

const _SENTENCE_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']

// ────────────────────────────────────────────────
// Random helpers
// ────────────────────────────────────────────────

function _pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function _shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getDateSeed(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// ────────────────────────────────────────────────
// Question generation templates per level
// ────────────────────────────────────────────────

// Each level has a bank of passage templates. The generator rotates through topics
// and selects themes to maintain diversity.

// Level 1: Simple cause-and-effect (3 slots, direct hints)
function generateLevel1(topic: Topic, themeIndex: number): Question {
  const themes = TOPIC_THEMES[topic]
  const _theme = themes[themeIndex % themes.length]

  const templates: Record<Topic, () => Question> = {
    humanities: () => ({
      difficulty_level: 1,
      topic: 'humanities',
      passage: `언어는 단순한 의사소통 수단이 아니라 사고를 구성하는 틀이다. 사용하는 언어에 따라 세계를 바라보는 방식이 달라질 수 있다. 따라서 다양한 언어를 배우는 것은 다양한 사고방식을 습득하는 것과 같다.`,
      sentences: [
        { id: 'a', text: '언어는 사고를 구성하는 구조적 틀이다' },
        { id: 'b', text: '사용 언어에 따라 세계 인식이 달라진다' },
        { id: 'c', text: '다양한 언어 학습은 다양한 사고의 확장이다' },
        { id: 'd', text: '모든 언어는 동일한 사고방식을 반영한다' },
      ],
      conclusion: '언어의 다양성은 곧 사고의 다양성이다.',
      correct_chain: ['a', 'b', 'c'],
      hints: [
        { level: 1, text: '첫 번째: 언어의 본질에 관한 문장입니다' },
        { level: 2, text: '두 번째: 언어가 인식에 미치는 영향입니다' },
        { level: 3, text: '세 번째: 결론으로서의 언어 학습의 의미입니다' },
      ],
    }),
    social: () => ({
      difficulty_level: 1,
      topic: 'social',
      passage: `세금은 국가 운영의 재원이다. 시민은 세금을 납부함으로써 공공 서비스를 이용할 수 있다. 따라서 세금 납부는 시민의 의무이자 공공 혜택의 기반이다.`,
      sentences: [
        { id: 'a', text: '세금은 국가 운영의 재원이다' },
        { id: 'b', text: '세금 납부로 공공 서비스를 이용한다' },
        { id: 'c', text: '세금은 시민 의무이자 공공 혜택의 기반이다' },
        { id: 'd', text: '세금은 부유층에만 부과되어야 한다' },
      ],
      conclusion: '조세는 공공 복리의 필수 기반이다.',
      correct_chain: ['a', 'b', 'c'],
      hints: [
        { level: 1, text: '원인(재원) → 기능(서비스) → 의미(의무) 순입니다' },
        { level: 2, text: '두 번째: 세금의 기능을 설명합니다' },
        { level: 3, text: '세 번째: 전체 논리를 종합합니다' },
      ],
    }),
    science: () => ({
      difficulty_level: 1,
      topic: 'science',
      passage: `물은 0도에서 얼고 100도에서 끓는다. 온도가 올라가면 물 분자의 운동이 활발해진다. 분자 운동이 충분히 활발해지면 액체가 기체로 변한다.`,
      sentences: [
        { id: 'a', text: '온도 상승은 물 분자의 운동을 활발하게 한다' },
        { id: 'b', text: '분자 운동이 충분히 활발해지면 상태가 변한다' },
        { id: 'c', text: '액체 물이 기체(수증기)로 변환된다' },
        { id: 'd', text: '물은 어떤 온도에서도 끓지 않는다' },
      ],
      conclusion: '끓음은 분자 운동 에너지가 임계점을 넘는 현상이다.',
      correct_chain: ['a', 'b', 'c'],
      hints: [
        { level: 1, text: '원인 → 과정 → 결과 순서입니다' },
        { level: 2, text: '두 번째: 분자 수준의 변화입니다' },
        { level: 3, text: '세 번째: 최종 상태 변화입니다' },
      ],
    }),
    tech: () => ({
      difficulty_level: 1,
      topic: 'tech',
      passage: `비밀번호는 개인 정보를 보호하는 첫 번째 방벽이다. 약한 비밀번호는 해킹에 취약하다. 따라서 복잡하고 긴 비밀번호를 사용해야 보안이 강화된다.`,
      sentences: [
        { id: 'a', text: '비밀번호는 개인 정보 보호의 첫 번째 방벽이다' },
        { id: 'b', text: '약한 비밀번호는 해킹에 취약하다' },
        { id: 'c', text: '복잡한 비밀번호가 보안을 강화한다' },
        { id: 'd', text: '비밀번호는 보안에 영향을 주지 않는다' },
      ],
      conclusion: '강력한 비밀번호는 디지털 보안의 기본이다.',
      correct_chain: ['a', 'b', 'c'],
      hints: [
        { level: 1, text: '역할 → 약점 → 해결책 순서입니다' },
        { level: 2, text: '두 번째: 약점을 지적하는 문장입니다' },
        { level: 3, text: '세 번째: 해결 방안입니다' },
      ],
    }),
    arts: () => ({
      difficulty_level: 1,
      topic: 'arts',
      passage: `그림은 색과 형태로 감정을 표현하는 예술이다. 따뜻한 색은 활기를, 차가운 색은 차분함을 전달한다. 예술가는 색의 선택을 통해 관객의 감정에 영향을 준다.`,
      sentences: [
        { id: 'a', text: '그림은 색과 형태로 감정을 표현한다' },
        { id: 'b', text: '색온도가 전달하는 감정이 다르다' },
        { id: 'c', text: '색 선택이 관객의 감정에 영향을 준다' },
        { id: 'd', text: '모든 색은 동일한 감정을 유발한다' },
      ],
      conclusion: '색채는 예술에서 감정 전달의 핵심 도구이다.',
      correct_chain: ['a', 'b', 'c'],
      hints: [
        { level: 1, text: '정의 → 원리 → 적용 순서입니다' },
        { level: 2, text: '두 번째: 색의 감정적 효과입니다' },
        { level: 3, text: '세 번째: 예술가의 의도적 활용입니다' },
      ],
    }),
  }

  return templates[topic]()
}

// For levels 2-7, we generate parametrically using topic themes
// Each level increases complexity progressively

function generateQuestion(level: number, topic: Topic, themeIndex: number): Question {
  // For level 1, use dedicated simple templates
  if (level === 1) return generateLevel1(topic, themeIndex)

  const config = LEVEL_CONFIG[level]
  const themes = TOPIC_THEMES[topic]
  const _theme = themes[themeIndex % themes.length]
  const _slots = config.slots
  const _distractorCount = level <= 4 ? 1 : 2

  // Generate a passage and logical chain based on level/topic
  // We use structured templates for each level tier

  if (level === 2) return generateLevel2(topic, themeIndex)
  if (level === 3) return generateLevel3(topic, themeIndex)
  if (level === 4) return generateLevel4(topic, themeIndex)
  if (level === 5) return generateLevel5(topic, themeIndex)
  if (level === 6) return generateLevel6(topic, themeIndex)
  return generateLevel7(topic, themeIndex)
}

// ── Level 2: 3 slots, direct hints, partially abstract ──

function generateLevel2(topic: Topic, idx: number): Question {
  const banks: Record<Topic, Question[]> = {
    humanities: [
      {
        difficulty_level: 2, topic: 'humanities',
        passage: '아리스토텔레스는 모든 존재에 목적이 있다고 보았다. 인간의 고유한 기능은 이성적 활동이다. 따라서 인간의 최고선은 이성에 따른 덕스러운 삶이다. 이 관점은 목적론적 윤리학의 근간이 되었다.',
        sentences: [
          { id: 'a', text: '모든 존재에는 고유한 목적이 있다' },
          { id: 'b', text: '인간의 고유 기능은 이성적 활동이다' },
          { id: 'c', text: '최고선은 이성에 따른 덕스러운 삶이다' },
          { id: 'd', text: '감각적 쾌락이 인간의 궁극적 목적이다' },
        ],
        conclusion: '아리스토텔레스의 덕 윤리학은 이성적 삶을 최고선으로 제시한다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '전제 → 인간의 특성 → 결론 순서입니다' },
          { level: 2, text: '두 번째: 인간만의 고유한 능력입니다' },
        ],
      },
      {
        difficulty_level: 2, topic: 'humanities',
        passage: '경험론은 모든 지식이 감각 경험에서 비롯된다고 주장한다. 선천적 관념은 존재하지 않으며 인간의 마음은 백지와 같다. 따라서 관찰과 실험이 진정한 앎의 근거가 된다.',
        sentences: [
          { id: 'a', text: '모든 지식은 감각 경험에서 비롯된다' },
          { id: 'b', text: '인간의 마음은 태어날 때 백지와 같다' },
          { id: 'c', text: '관찰과 실험이 진정한 앎의 근거이다' },
          { id: 'd', text: '이성만으로 모든 진리를 파악할 수 있다' },
        ],
        conclusion: '경험론은 감각적 증거에 기반한 지식 체계를 확립했다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '핵심 주장 → 근거 → 방법론적 결론 순서입니다' },
          { level: 2, text: '세 번째: 구체적 방법론입니다' },
        ],
      },
    ],
    social: [
      {
        difficulty_level: 2, topic: 'social',
        passage: '공공재는 비배제성과 비경합성을 특징으로 한다. 이 특성 때문에 개인은 비용을 부담하지 않고 이용하려는 유인이 생긴다. 이를 무임승차 문제라 하며, 공공재가 시장에서 과소 공급되는 원인이 된다.',
        sentences: [
          { id: 'a', text: '공공재는 비배제성과 비경합성을 특징으로 한다' },
          { id: 'b', text: '무임승차 유인이 발생한다' },
          { id: 'c', text: '공공재가 시장에서 과소 공급된다' },
          { id: 'd', text: '시장은 공공재를 항상 적정량 공급한다' },
        ],
        conclusion: '무임승차 문제는 공공재의 시장 실패를 유발한다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '특성 → 문제 발생 → 결과 순서입니다' },
          { level: 2, text: '두 번째: 공공재 특성으로 인한 행동 문제입니다' },
        ],
      },
      {
        difficulty_level: 2, topic: 'social',
        passage: '노동시장에서 임금은 노동의 수요와 공급에 의해 결정된다. 특정 기술을 가진 노동자의 공급이 적으면 임금이 올라간다. 기술 변화는 노동 수요 구조를 바꾸어 임금 격차를 확대시킬 수 있다.',
        sentences: [
          { id: 'a', text: '임금은 노동의 수요와 공급에 의해 결정된다' },
          { id: 'b', text: '희소한 기술의 노동자는 높은 임금을 받는다' },
          { id: 'c', text: '기술 변화가 임금 격차를 확대시킨다' },
          { id: 'd', text: '모든 노동자의 임금은 항상 동일하다' },
        ],
        conclusion: '기술 변화는 노동시장의 임금 구조를 재편한다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '원리 → 적용 → 결과 순서입니다' },
          { level: 2, text: '세 번째: 거시적 결과입니다' },
        ],
      },
    ],
    science: [
      {
        difficulty_level: 2, topic: 'science',
        passage: '세포는 모든 생물의 기본 단위이다. 세포는 세포막으로 둘러싸여 있으며 내부에서 대사 활동이 이루어진다. 세포 분열을 통해 생물은 성장하고 손상된 조직을 복구한다.',
        sentences: [
          { id: 'a', text: '세포는 모든 생물의 기본 구성 단위이다' },
          { id: 'b', text: '세포막 내부에서 대사 활동이 이루어진다' },
          { id: 'c', text: '세포 분열로 성장과 조직 복구가 가능하다' },
          { id: 'd', text: '세포는 외부 물질을 차단하지 못한다' },
        ],
        conclusion: '세포의 구조와 분열은 생명 유지의 기본 기제이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '정의 → 기능 → 의의 순서입니다' },
          { level: 2, text: '세 번째: 세포의 생물학적 역할입니다' },
        ],
      },
      {
        difficulty_level: 2, topic: 'science',
        passage: '소화는 음식물을 작은 분자로 분해하는 과정이다. 소화 효소가 탄수화물, 단백질, 지방을 각각 분해한다. 분해된 영양소는 소장에서 흡수되어 에너지원으로 사용된다.',
        sentences: [
          { id: 'a', text: '소화는 음식물을 작은 분자로 분해하는 과정이다' },
          { id: 'b', text: '효소가 탄수화물·단백질·지방을 분해한다' },
          { id: 'c', text: '소장에서 영양소가 흡수되어 에너지로 쓰인다' },
          { id: 'd', text: '음식은 분해 없이 바로 에너지로 전환된다' },
        ],
        conclusion: '소화 과정은 영양소의 흡수와 에너지 전환을 위한 필수 단계이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '정의 → 메커니즘 → 결과 순서입니다' },
          { level: 2, text: '두 번째: 구체적 분해 과정입니다' },
        ],
      },
    ],
    tech: [
      {
        difficulty_level: 2, topic: 'tech',
        passage: '인터넷은 전 세계 컴퓨터를 연결하는 네트워크이다. 데이터는 패킷 단위로 나뉘어 여러 경로를 통해 목적지에 도달한다. 이 분산 구조 덕분에 한 경로가 차단되어도 데이터 전송이 가능하다.',
        sentences: [
          { id: 'a', text: '인터넷은 전 세계 컴퓨터를 연결하는 네트워크이다' },
          { id: 'b', text: '데이터는 패킷으로 분할되어 여러 경로로 전송된다' },
          { id: 'c', text: '분산 구조 덕에 경로 장애에도 전송이 지속된다' },
          { id: 'd', text: '데이터는 항상 단일 경로로만 전송된다' },
        ],
        conclusion: '패킷 기반 분산 네트워크가 인터넷의 복원력을 보장한다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '정의 → 작동 방식 → 장점 순서입니다' },
          { level: 2, text: '세 번째: 분산의 이점입니다' },
        ],
      },
      {
        difficulty_level: 2, topic: 'tech',
        passage: '검색 엔진은 웹 페이지를 크롤링하여 색인을 만든다. 사용자의 검색어와 색인을 대조하여 관련 페이지를 순위별로 보여준다. 페이지 랭크 알고리즘은 링크 수를 기반으로 중요도를 판단한다.',
        sentences: [
          { id: 'a', text: '웹 페이지를 크롤링하여 색인을 구축한다' },
          { id: 'b', text: '검색어와 색인을 대조해 관련 페이지를 제시한다' },
          { id: 'c', text: '링크 기반 알고리즘으로 페이지 중요도를 판단한다' },
          { id: 'd', text: '검색 결과는 무작위로 정렬된다' },
        ],
        conclusion: '검색 엔진은 크롤링·색인·랭킹의 3단계로 정보를 조직한다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '수집 → 검색 → 순위화 순서입니다' },
          { level: 2, text: '세 번째: 결과 정렬 기준입니다' },
        ],
      },
    ],
    arts: [
      {
        difficulty_level: 2, topic: 'arts',
        passage: '음악의 리듬은 시간의 조직이다. 규칙적인 박자는 안정감을, 불규칙한 박자는 긴장감을 만든다. 작곡가는 리듬 변화를 통해 감정의 흐름을 조절한다.',
        sentences: [
          { id: 'a', text: '리듬은 시간을 조직하는 음악적 요소이다' },
          { id: 'b', text: '박자의 규칙성에 따라 안정감과 긴장감이 달라진다' },
          { id: 'c', text: '작곡가는 리듬으로 감정의 흐름을 설계한다' },
          { id: 'd', text: '리듬은 음악에서 중요하지 않은 요소이다' },
        ],
        conclusion: '리듬은 음악의 시간적 구조이자 감정 전달의 핵심 도구이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '정의 → 효과 → 활용 순서입니다' },
          { level: 2, text: '세 번째: 예술적 의도입니다' },
        ],
      },
      {
        difficulty_level: 2, topic: 'arts',
        passage: '연극은 배우의 몸과 목소리로 이야기를 전달하는 공연 예술이다. 무대 연출은 조명·음향·의상을 결합하여 분위기를 조성한다. 관객은 이 요소들이 만드는 총체적 경험을 통해 감동을 받는다.',
        sentences: [
          { id: 'a', text: '연극은 배우의 신체와 목소리를 통한 이야기 전달이다' },
          { id: 'b', text: '연출은 조명·음향·의상으로 분위기를 만든다' },
          { id: 'c', text: '관객은 총체적 경험을 통해 감동한다' },
          { id: 'd', text: '연극은 대본 낭독만으로 완성된다' },
        ],
        conclusion: '연극은 다양한 예술 요소의 총합이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '핵심 매체 → 연출 요소 → 수용자 경험 순서입니다' },
          { level: 2, text: '두 번째: 무대의 종합 요소입니다' },
        ],
      },
    ],
  }

  const bank = banks[topic]
  return bank[idx % bank.length]
}

// For levels 3-7, we'll reuse the previously seeded question patterns
// but with variation. In production this would call an LLM API.
// For now we rotate from level-specific banks per topic.

function generateLevel3(topic: Topic, idx: number): Question {
  // Level 3: 4 slots, semi-direct hints
  const base = generateLevel2(topic, idx)
  return {
    ...base,
    difficulty_level: 3,
    sentences: [
      ...base.sentences,
      { id: 'e', text: '이 주장의 전제는 논란의 여지가 있다' },
    ],
    correct_chain: [...base.correct_chain, base.sentences[2].id === 'c' ? 'c' : 'b'].slice(0, 4),
    hints: [
      { level: 1, text: '논증의 전제에서 결론으로 나아가는 4단계 구조를 따르세요' },
      { level: 2, text: '마지막 슬롯은 논증의 최종 결론입니다' },
    ],
  }
}

function generateLevel4(topic: Topic, idx: number): Question {
  // Level 4: 4 slots, semi-direct hints, exam-level
  return generateLevel3(topic, idx + 1)
}

function generateLevel5(topic: Topic, idx: number): Question {
  // Level 5: 5 slots, indirect hints, contrast/reversal
  const base = generateLevel2(topic, idx)
  return {
    ...base,
    difficulty_level: 5,
    sentences: [
      ...base.sentences,
      { id: 'e', text: '그러나 이에 대한 반론도 존재한다' },
      { id: 'f', text: '반론을 종합하면 원래 논증이 수정되어야 한다' },
    ],
    correct_chain: [base.correct_chain[0], base.correct_chain[1], base.correct_chain[2], 'e', 'f'].slice(0, 5),
    hints: [
      { level: 1, text: '주장 → 근거 → 결론 → 반론 → 종합의 변증법적 구조를 찾으세요' },
    ],
  }
}

function generateLevel6(topic: Topic, idx: number): Question {
  // Level 6: 6 slots, indirect hints
  const base = generateLevel5(topic, idx)
  return {
    ...base,
    difficulty_level: 6,
    sentences: [
      ...base.sentences,
      { id: 'g', text: '이 논쟁은 학문 전체에 영향을 미쳤다' },
    ],
    correct_chain: [...base.correct_chain, 'g'].slice(0, 6),
    hints: [
      { level: 1, text: '논증 → 반론 → 종합 → 영향의 6단계 구조를 추적하세요' },
    ],
  }
}

function generateLevel7(topic: Topic, idx: number): Question {
  // Level 7: 7 slots, no hints
  const base = generateLevel6(topic, idx)
  return {
    ...base,
    difficulty_level: 7,
    sentences: [
      ...base.sentences,
      { id: 'h', text: '현대 연구는 이 논의를 새로운 관점에서 재조명한다' },
    ],
    correct_chain: [...base.correct_chain, 'h'].slice(0, 7),
    hints: [],
  }
}

// ────────────────────────────────────────────────
// Main: generate 10 questions × 7 levels = 70 questions
// ────────────────────────────────────────────────

async function main() {
  const dateSeed = getDateSeed()
  console.log(`📚 [${dateSeed}] 일일 문제 생성 시작 — 7레벨 × 10문제 = 70문제\n`)

  const topics: Topic[] = ['humanities', 'social', 'science', 'tech', 'arts']
  let totalSuccess = 0
  let totalFail = 0

  for (let level = 1; level <= 7; level++) {
    console.log(`\n── 레벨 ${level} ──`)

    for (let i = 0; i < 10; i++) {
      const topic = topics[i % topics.length]
      const question = generateQuestion(level, topic, Math.floor(i / topics.length))

      const { data, error } = await supabase
        .from('questions')
        .insert(question)
        .select()

      if (error) {
        console.error(`  ❌ L${level}-${i + 1} [${topic}]: ${error.message}`)
        totalFail++
      } else {
        console.log(`  ✅ L${level}-${i + 1} [${topic}]: ${data[0].id}`)
        totalSuccess++
      }
    }
  }

  console.log(`\n🎉 완료! 성공: ${totalSuccess}, 실패: ${totalFail}`)
  console.log(`📊 총 문제 수: ${totalSuccess}`)
}

main().catch(console.error)
