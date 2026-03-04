/**
 * 초기 문제 데이터 시딩 스크립트
 * 실행: npx tsx scripts/seed-questions.ts
 *
 * 사전 준비:
 * 1. .env.local 파일에 SUPABASE_SERVICE_ROLE_KEY 설정
 * 2. Supabase DB에 마이그레이션 적용 완료
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const QUESTIONS = [
  // ─── 레벨 1 (3단계, 직접 힌트) ───
  {
    difficulty_level: 1,
    topic: 'social',
    passage: `민주주의는 다수결 원칙을 기반으로 한다. 그러나 단순한 다수결만으로는 소수의 권리를 보호할 수 없다. 따라서 현대 민주주의는 헌법을 통해 기본권을 보장하며, 이를 위해 사법부의 독립이 필수적이다.`,
    sentences: [
      { id: 'a', text: '다수결만으로는 소수 권리 보호가 불충분하다' },
      { id: 'b', text: '헌법을 통한 기본권 보장이 필요하다' },
      { id: 'c', text: '사법부의 독립이 민주주의를 완성시킨다' },
      { id: 'd', text: '경제적 평등이 민주주의의 근본이다' },
    ],
    conclusion: '현대 민주주의는 다수결과 헌법적 보호의 균형 위에 서 있다.',
    correct_chain: ['a', 'b', 'c'],
    hints: [
      { level: 1, text: '첫 번째 슬롯: 다수결의 한계에 관한 문장을 찾으세요' },
      { level: 2, text: '두 번째 슬롯: 해결책(헌법)을 제시하는 문장입니다' },
      { level: 3, text: '세 번째 슬롯: 사법부의 역할로 마무리됩니다' },
    ],
  },
  {
    difficulty_level: 1,
    topic: 'science',
    passage: `지구 온난화는 온실가스 증가로 인해 발생한다. 온실가스 중 이산화탄소가 가장 큰 비중을 차지한다. 이산화탄소 배출의 주요 원인은 화석연료 연소이다. 따라서 재생에너지로의 전환이 온난화 대응의 핵심이다.`,
    sentences: [
      { id: 'a', text: '온실가스 증가가 지구 온난화를 유발한다' },
      { id: 'b', text: '이산화탄소가 온실가스의 주범이다' },
      { id: 'c', text: '화석연료 연소가 이산화탄소를 배출한다' },
      { id: 'd', text: '핵에너지가 최선의 대안이다' },
    ],
    conclusion: '재생에너지 전환이 온난화 해결의 핵심 경로이다.',
    correct_chain: ['a', 'b', 'c'],
    hints: [
      { level: 1, text: '원인 → 구체 원인 → 더 구체적 원인 순서입니다' },
      { level: 2, text: '두 번째: 이산화탄소에 관한 문장입니다' },
      { level: 3, text: '세 번째: 화석연료를 언급하는 문장입니다' },
    ],
  },
  {
    difficulty_level: 1,
    topic: 'humanities',
    passage: `언어는 단순한 소통 도구가 아니라 사고를 구성하는 틀이다. 사피어-워프 가설에 따르면 언어가 사고방식을 규정한다. 서로 다른 언어를 쓰는 집단은 세계를 다르게 인식할 수 있다.`,
    sentences: [
      { id: 'a', text: '언어는 사고방식을 형성하는 구조이다' },
      { id: 'b', text: '사피어-워프 가설이 이를 뒷받침한다' },
      { id: 'c', text: '언어 차이가 세계 인식의 차이로 이어진다' },
      { id: 'd', text: '번역은 언어의 차이를 완전히 극복한다' },
    ],
    conclusion: '언어는 인간의 세계 인식을 근본적으로 규정한다.',
    correct_chain: ['a', 'b', 'c'],
    hints: [
      { level: 1, text: '주장 → 근거 이론 → 구체적 사례 순서입니다' },
      { level: 2, text: '두 번째: 사피어-워프를 언급하세요' },
      { level: 3, text: '세 번째: 언어 차이의 결과를 설명합니다' },
    ],
  },

  // ─── 레벨 2 (4단계, 반직접 힌트) ───
  {
    difficulty_level: 2,
    topic: 'social',
    passage: `시장 경제는 가격 기제를 통해 자원을 배분한다. 가격이 오르면 공급이 늘고 수요가 줄어 균형에 이른다. 그러나 외부효과가 존재할 때 시장은 사회적 최적 수준을 달성하지 못한다. 이를 시장 실패라 하며, 정부 개입의 근거가 된다. 환경 오염세는 대표적인 시장 실패 교정 수단이다.`,
    sentences: [
      { id: 'a', text: '가격 기제를 통해 시장은 자원을 배분한다' },
      { id: 'b', text: '외부효과가 있으면 시장은 최적 결과를 내지 못한다' },
      { id: 'c', text: '이를 시장 실패라고 한다' },
      { id: 'd', text: '정부 개입이 시장 실패를 교정할 수 있다' },
      { id: 'e', text: '수요와 공급이 항상 균형을 이룬다' },
    ],
    conclusion: '환경세는 시장 실패를 교정하는 정부 개입의 예시다.',
    correct_chain: ['a', 'b', 'c', 'd'],
    hints: [
      { level: 1, text: '시장 원리 → 실패 조건 → 실패 정의 → 해결책 순서입니다' },
      { level: 2, text: '세 번째 슬롯은 두 번째의 결론을 명명하는 문장입니다' },
    ],
  },
  {
    difficulty_level: 2,
    topic: 'tech',
    passage: `인공지능은 방대한 데이터에서 패턴을 학습한다. 학습된 패턴은 새로운 데이터에 적용되어 예측을 수행한다. 그러나 학습 데이터에 편향이 있으면 모델도 편향된 예측을 한다. 이는 사회적 불평등을 강화할 수 있다. 따라서 AI 개발 시 데이터 품질 관리가 필수이다.`,
    sentences: [
      { id: 'a', text: '인공지능은 데이터 패턴을 학습해 예측에 활용한다' },
      { id: 'b', text: '편향된 학습 데이터는 편향된 예측을 낳는다' },
      { id: 'c', text: '이로 인해 사회적 불평등이 심화될 수 있다' },
      { id: 'd', text: '데이터 품질 관리가 AI 윤리의 핵심이다' },
      { id: 'e', text: '데이터가 많을수록 AI는 항상 정확해진다' },
    ],
    conclusion: '공정한 AI를 위해 데이터 편향 제거가 선행되어야 한다.',
    correct_chain: ['a', 'b', 'c', 'd'],
    hints: [
      { level: 1, text: '원리 → 문제 조건 → 결과 → 해결책 구조입니다' },
      { level: 2, text: '세 번째 슬롯: 사회적 영향을 설명하는 문장입니다' },
    ],
  },

  // ─── 레벨 3 (5단계, 간접 힌트) ───
  {
    difficulty_level: 3,
    topic: 'humanities',
    passage: `근대 과학혁명은 세계를 기계론적으로 바라보는 관점을 낳았다. 이 관점에서 자연은 수학 법칙으로 완전히 기술 가능한 체계였다. 그러나 20세기 양자역학은 관찰자가 결과에 영향을 미친다는 것을 보여주었다. 이는 객관적 관찰이라는 근대 과학의 전제를 흔들었다. 결국 과학은 완전한 객관성보다 상호주관적 검증에 의존한다는 인식이 형성되었다.`,
    sentences: [
      { id: 'a', text: '근대 과학은 세계를 기계론적 수학 체계로 보았다' },
      { id: 'b', text: '양자역학은 관찰자가 결과에 영향을 준다고 밝혔다' },
      { id: 'c', text: '이는 객관적 관찰이라는 전제를 뒤흔들었다' },
      { id: 'd', text: '과학은 상호주관적 검증에 의존한다는 이해가 생겼다' },
      { id: 'e', text: '현대 물리학은 뉴턴 역학을 완전히 폐기했다' },
      { id: 'f', text: '과학혁명은 종교와 과학을 통합시켰다' },
    ],
    conclusion: '과학적 객관성은 절대적이 아니라 공동체적 검증에 기반한다.',
    correct_chain: ['a', 'b', 'c', 'd', null],
    hints: [
      { level: 1, text: '역사적 관점 → 반례 등장 → 전제 붕괴 → 새로운 이해 흐름을 따르세요' },
    ],
  },
]

async function seed() {
  console.log('📚 문제 데이터 시딩 시작...\n')

  for (const q of QUESTIONS) {
    const { data, error } = await supabase.from('questions').insert(q).select()
    if (error) {
      console.error(`❌ 오류 (레벨 ${q.difficulty_level}):`, error.message)
    } else {
      console.log(`✅ 레벨 ${q.difficulty_level} 문제 추가됨: ${data[0].id}`)
    }
  }

  console.log('\n🎉 시딩 완료!')
}

seed().catch(console.error)
