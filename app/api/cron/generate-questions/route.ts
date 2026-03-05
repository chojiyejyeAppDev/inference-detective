/**
 * Vercel Cron Job: Daily Question Generator
 *
 * Generates 10 questions per difficulty level (7 levels = 70 questions)
 * and inserts them into Supabase.
 *
 * Schedule: Every day at 7:00 AM KST (22:00 UTC previous day)
 * Endpoint: GET /api/cron/generate-questions
 *
 * Protected by CRON_SECRET env var to prevent unauthorized access.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Question, Topic } from '@/lib/questions/types'
import { LEVEL3_QUESTIONS, LEVEL4_QUESTIONS } from '@/lib/questions/question-bank-l3-l4'
import { LEVEL5_QUESTIONS, LEVEL6_QUESTIONS, LEVEL7_QUESTIONS } from '@/lib/questions/question-bank-l5-l7'

// ── Level Configuration ────────────────────────────
const LEVEL_CONFIG: Record<number, { slots: number; hintCount: number }> = {
  1: { slots: 3, hintCount: 3 },
  2: { slots: 3, hintCount: 3 },
  3: { slots: 4, hintCount: 2 },
  4: { slots: 4, hintCount: 2 },
  5: { slots: 5, hintCount: 1 },
  6: { slots: 6, hintCount: 1 },
  7: { slots: 7, hintCount: 0 },
}

const TOPICS: Topic[] = ['humanities', 'social', 'science', 'tech', 'arts']

// ── Helper: group flat Question[] by topic ─────────
function groupByTopic(questions: Question[]): Record<Topic, Question[]> {
  const result: Record<Topic, Question[]> = {
    humanities: [],
    social: [],
    science: [],
    tech: [],
    arts: [],
  }
  for (const q of questions) {
    result[q.topic].push(q)
  }
  return result
}

// ── Question Bank per Level ────────────────────────
// Each level has a pool of pre-written high-quality questions.
// The generator randomly picks 10 (2 per topic) each day,
// ensuring variety through date-based seeding.
// Levels 1-2: inline questions. Levels 3-7: imported from lib/questions/.

const QUESTION_BANK: Record<number, Record<Topic, Question[]>> = {
  // ═══════════════════════════════════════════
  // LEVEL 1 — 일상/기초 인과, 3슬롯
  // ═══════════════════════════════════════════
  1: {
    humanities: [
      {
        difficulty_level: 1,
        topic: 'humanities',
        passage: '독서는 어휘력을 향상시키는 대표적인 방법이다. 다양한 글을 읽으면 새로운 단어와 표현을 자연스럽게 접하게 된다. 풍부한 어휘력은 정확한 의사소통의 기초가 된다.',
        sentences: [
          { id: 'a', text: '독서를 통해 다양한 단어와 표현을 접한다' },
          { id: 'b', text: '반복적 노출로 어휘력이 자연스럽게 향상된다' },
          { id: 'c', text: '풍부한 어휘력은 정확한 의사소통을 가능하게 한다' },
          { id: 'd', text: '글을 읽는 속도가 빠를수록 좋다' },
        ],
        conclusion: '독서는 의사소통 능력 향상의 기본이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '독서 → 어휘 → 소통의 순서를 생각해 보세요' },
          { level: 2, text: '첫 번째 단계: 독서로 무엇을 접하게 되나요?' },
          { level: 3, text: '정답 첫 카드는 "다양한 단어와 표현"에 관한 것입니다' },
        ],
      },
      {
        difficulty_level: 1,
        topic: 'humanities',
        passage: '일기를 쓰는 습관은 자기 성찰에 도움이 된다. 하루를 돌아보며 감정과 생각을 정리하면 자신을 더 깊이 이해하게 된다. 이러한 자기 이해는 감정 조절 능력의 기반이 된다.',
        sentences: [
          { id: 'a', text: '일기 작성을 통해 하루의 감정과 생각을 정리한다' },
          { id: 'b', text: '감정과 생각의 정리는 자기 이해를 깊게 한다' },
          { id: 'c', text: '깊은 자기 이해는 감정 조절 능력을 키운다' },
          { id: 'd', text: '일기는 반드시 매일 써야 효과가 있다' },
        ],
        conclusion: '일기 쓰기는 정서적 성숙의 도구이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '행위 → 이해 → 능력의 인과 관계를 따라가세요' },
          { level: 2, text: '일기를 쓰면 먼저 무엇이 정리되나요?' },
          { level: 3, text: '"감정과 생각을 정리"하는 것이 출발점입니다' },
        ],
      },
      {
        difficulty_level: 1,
        topic: 'humanities',
        passage: '음악 감상은 스트레스를 줄이는 데 효과적이다. 음악은 뇌에서 도파민 분비를 촉진하여 긍정적 감정을 유발한다. 긍정적 감정 상태는 스트레스 호르몬인 코르티솔 수치를 낮추는 데 기여한다.',
        sentences: [
          { id: 'a', text: '음악이 뇌에서 도파민 분비를 촉진한다' },
          { id: 'b', text: '도파민이 긍정적 감정을 유발한다' },
          { id: 'c', text: '긍정적 감정이 코르티솔 수치를 낮춘다' },
          { id: 'd', text: '클래식 음악만 이러한 효과가 있다' },
        ],
        conclusion: '음악 감상은 과학적으로 검증된 스트레스 해소법이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '음악 → 뇌 반응 → 호르몬 변화를 추적하세요' },
          { level: 2, text: '음악이 뇌에 미치는 첫 번째 영향은?' },
          { level: 3, text: '도파민 분비가 시작점입니다' },
        ],
      },
    ],
    social: [
      {
        difficulty_level: 1,
        topic: 'social',
        passage: '교통 체증은 도시의 주요 문제 중 하나이다. 자동차 수가 도로 용량을 초과하면 정체가 발생한다. 정체가 길어지면 배기가스가 증가하여 대기 오염이 심화된다.',
        sentences: [
          { id: 'a', text: '자동차 수가 도로 용량을 초과한다' },
          { id: 'b', text: '도로에 정체가 발생하여 차량이 오래 멈춰 있는다' },
          { id: 'c', text: '배기가스 배출이 증가하여 대기 오염이 심화된다' },
          { id: 'd', text: '도로를 넓히면 교통 체증이 완전히 해결된다' },
        ],
        conclusion: '교통 체증은 환경 오염의 직접적 원인이 된다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '원인 → 현상 → 결과의 순서입니다' },
          { level: 2, text: '차가 많아지면 먼저 무슨 일이 생기나요?' },
          { level: 3, text: '"도로 용량 초과"가 첫 단계입니다' },
        ],
      },
      {
        difficulty_level: 1,
        topic: 'social',
        passage: '최저임금 인상은 저소득 근로자의 생활을 개선하려는 정책이다. 임금이 오르면 근로자의 구매력이 증가한다. 구매력 증가는 소비를 촉진하여 지역 경제 활성화에 기여한다.',
        sentences: [
          { id: 'a', text: '최저임금이 인상되어 근로자의 소득이 증가한다' },
          { id: 'b', text: '소득 증가로 근로자의 구매력이 향상된다' },
          { id: 'c', text: '구매력 향상이 소비를 촉진하여 경제가 활성화된다' },
          { id: 'd', text: '최저임금 인상은 반드시 실업률을 높인다' },
        ],
        conclusion: '최저임금 인상은 소비 촉진을 통해 경제에 긍정적 영향을 줄 수 있다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '임금 → 구매력 → 경제 효과의 흐름입니다' },
          { level: 2, text: '임금이 오르면 가장 먼저 변하는 것은?' },
          { level: 3, text: '소득 증가가 시작점입니다' },
        ],
      },
      {
        difficulty_level: 1,
        topic: 'social',
        passage: '재활용은 쓰레기 매립지의 포화를 늦추는 방법이다. 플라스틱이나 종이를 재활용하면 새로운 원료 채취가 줄어든다. 원료 채취 감소는 자연환경 파괴를 완화하는 데 기여한다.',
        sentences: [
          { id: 'a', text: '플라스틱과 종이를 분리하여 재활용한다' },
          { id: 'b', text: '재활용으로 새로운 원료 채취 필요성이 감소한다' },
          { id: 'c', text: '원료 채취 감소가 자연환경 보전에 기여한다' },
          { id: 'd', text: '모든 쓰레기는 재활용이 가능하다' },
        ],
        conclusion: '재활용은 자원 절약과 환경 보전의 핵심 수단이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '행동 → 자원 절약 → 환경 효과를 따라가세요' },
          { level: 2, text: '재활용을 하면 무엇이 줄어드나요?' },
          { level: 3, text: '"원료 채취 필요성 감소"가 중간 단계입니다' },
        ],
      },
    ],
    science: [
      {
        difficulty_level: 1,
        topic: 'science',
        passage: '물은 온도에 따라 상태가 변한다. 물을 100도까지 가열하면 수증기로 변하는 기화 현상이 일어난다. 수증기가 차가운 표면에 닿으면 다시 물방울로 응결된다.',
        sentences: [
          { id: 'a', text: '물을 가열하면 온도가 상승한다' },
          { id: 'b', text: '100도에 도달하면 수증기로 기화한다' },
          { id: 'c', text: '수증기가 냉각되면 물방울로 응결된다' },
          { id: 'd', text: '물은 항상 같은 온도에서 끓는다' },
        ],
        conclusion: '물의 상태 변화는 온도에 의해 결정된다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '가열 → 기화 → 응결의 과정입니다' },
          { level: 2, text: '물이 상태를 바꾸려면 먼저 무엇이 필요할까요?' },
          { level: 3, text: '"온도 상승"이 첫 번째 단계입니다' },
        ],
      },
      {
        difficulty_level: 1,
        topic: 'science',
        passage: '식물은 광합성을 통해 스스로 영양분을 만든다. 햇빛을 받으면 잎의 엽록소가 이산화탄소와 물을 포도당으로 변환한다. 이 과정에서 부산물로 산소가 방출된다.',
        sentences: [
          { id: 'a', text: '식물의 잎이 햇빛을 흡수한다' },
          { id: 'b', text: '엽록소가 이산화탄소와 물을 포도당으로 변환한다' },
          { id: 'c', text: '광합성의 부산물로 산소가 방출된다' },
          { id: 'd', text: '식물은 밤에도 광합성을 한다' },
        ],
        conclusion: '광합성은 식물의 자가 영양과 지구 산소 공급의 핵심이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '에너지 흡수 → 변환 → 산출의 순서입니다' },
          { level: 2, text: '광합성이 시작되려면 무엇이 필요한가요?' },
          { level: 3, text: '"햇빛 흡수"가 첫 단계입니다' },
        ],
      },
    ],
    tech: [
      {
        difficulty_level: 1,
        topic: 'tech',
        passage: '비밀번호 관리자는 보안을 강화하는 도구이다. 복잡한 비밀번호를 자동으로 생성하여 기억 부담을 줄여 준다. 각 서비스마다 고유한 비밀번호를 사용하면 하나가 유출되어도 다른 계정은 안전하다.',
        sentences: [
          { id: 'a', text: '비밀번호 관리자가 복잡한 비밀번호를 자동 생성한다' },
          { id: 'b', text: '서비스마다 고유한 비밀번호를 사용하게 된다' },
          { id: 'c', text: '하나의 비밀번호 유출이 다른 계정에 영향을 미치지 않는다' },
          { id: 'd', text: '짧은 비밀번호가 더 안전하다' },
        ],
        conclusion: '비밀번호 관리자는 계정 보안의 핵심 도구이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '도구 → 사용 방식 → 보안 효과의 흐름입니다' },
          { level: 2, text: '비밀번호 관리자가 먼저 해주는 일은?' },
          { level: 3, text: '"복잡한 비밀번호 자동 생성"이 시작입니다' },
        ],
      },
      {
        difficulty_level: 1,
        topic: 'tech',
        passage: '스마트폰의 GPS는 위성 신호를 이용하여 위치를 파악한다. 최소 세 개의 위성 신호를 수신하면 삼각측량으로 현재 위치를 계산한다. 이 위치 정보를 기반으로 내비게이션이 경로를 안내한다.',
        sentences: [
          { id: 'a', text: '스마트폰이 GPS 위성 신호를 수신한다' },
          { id: 'b', text: '세 개 이상의 신호로 삼각측량하여 위치를 계산한다' },
          { id: 'c', text: '계산된 위치를 기반으로 경로를 안내한다' },
          { id: 'd', text: 'GPS는 인터넷 연결 없이는 작동하지 않는다' },
        ],
        conclusion: 'GPS 위성 시스템은 정확한 위치 기반 서비스의 기반이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '신호 수신 → 위치 계산 → 경로 안내의 과정입니다' },
          { level: 2, text: 'GPS가 작동하려면 먼저 무엇을 받아야 하나요?' },
          { level: 3, text: '"위성 신호 수신"이 첫 단계입니다' },
        ],
      },
    ],
    arts: [
      {
        difficulty_level: 1,
        topic: 'arts',
        passage: '색의 삼원색은 빨강, 노랑, 파랑이다. 이 세 가지 색을 혼합하면 거의 모든 색을 만들어 낼 수 있다. 예를 들어 빨강과 노랑을 섞으면 주황이 되고, 이를 통해 다양한 색채 표현이 가능하다.',
        sentences: [
          { id: 'a', text: '빨강, 노랑, 파랑은 색의 삼원색이다' },
          { id: 'b', text: '삼원색을 혼합하면 다양한 색을 만들 수 있다' },
          { id: 'c', text: '이를 통해 풍부한 색채 표현이 가능해진다' },
          { id: 'd', text: '모든 색은 검정과 흰색의 조합이다' },
        ],
        conclusion: '삼원색의 원리는 미술에서 색채 표현의 기초이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '원리 → 응용 → 결과의 순서입니다' },
          { level: 2, text: '색 혼합의 출발점이 되는 것은?' },
          { level: 3, text: '"삼원색"이 시작점입니다' },
        ],
      },
      {
        difficulty_level: 1,
        topic: 'arts',
        passage: '영화에서 배경 음악은 관객의 감정을 유도하는 중요한 요소이다. 긴장감 있는 장면에 빠른 템포의 음악을 사용하면 관객의 심박수가 증가한다. 이러한 신체 반응은 장면에 대한 몰입도를 높여 준다.',
        sentences: [
          { id: 'a', text: '긴장 장면에 빠른 템포의 음악이 사용된다' },
          { id: 'b', text: '빠른 음악이 관객의 심박수를 높인다' },
          { id: 'c', text: '신체 반응 증가가 장면 몰입도를 높인다' },
          { id: 'd', text: '배경 음악 없는 영화가 더 감동적이다' },
        ],
        conclusion: '영화 음악은 관객의 감정적 몰입을 설계하는 도구이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '음악 → 신체 반응 → 심리 효과의 흐름입니다' },
          { level: 2, text: '빠른 음악이 먼저 영향을 미치는 것은?' },
          { level: 3, text: '"심박수 증가"가 중간 단계입니다' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // LEVEL 2 — 부분 추상 개념, 3슬롯
  // ═══════════════════════════════════════════
  2: {
    humanities: [
      {
        difficulty_level: 2,
        topic: 'humanities',
        passage: '칸트는 도덕 법칙이 보편적이어야 한다고 주장했다. 어떤 행위가 도덕적이려면 모든 이가 같은 상황에서 그 행위를 할 수 있어야 한다. 이 보편화 가능성의 원칙이 정언명령의 핵심이다.',
        sentences: [
          { id: 'a', text: '도덕 법칙은 개인이 아닌 보편적 원리여야 한다' },
          { id: 'b', text: '보편적 행위란 모든 사람이 동일하게 행할 수 있는 것이다' },
          { id: 'c', text: '이 보편화 가능성이 정언명령의 핵심 기준이다' },
          { id: 'd', text: '도덕은 각 개인의 감정에 따라 결정된다' },
        ],
        conclusion: '칸트의 정언명령은 도덕의 보편성을 요구한다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '원칙 → 기준 → 적용의 흐름입니다' },
          { level: 2, text: '칸트가 가장 먼저 요구하는 것은?' },
          { level: 3, text: '"보편적 원리"가 출발점입니다' },
        ],
      },
      {
        difficulty_level: 2,
        topic: 'humanities',
        passage: '소크라테스는 "너 자신을 알라"는 격언을 중시했다. 자기 무지를 인정하는 것이 참된 지혜의 시작이라 보았다. 무지의 자각은 끊임없는 탐구와 질문으로 이어진다.',
        sentences: [
          { id: 'a', text: '자기 자신을 아는 것이 철학의 출발이다' },
          { id: 'b', text: '무지를 인정하는 것이 참된 지혜의 시작이다' },
          { id: 'c', text: '무지의 자각이 지속적 탐구를 이끈다' },
          { id: 'd', text: '지식이 많을수록 더 지혜로운 사람이다' },
        ],
        conclusion: '소크라테스에게 철학적 탐구는 무지의 자각에서 시작된다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '자기 인식 → 겸손 → 탐구의 순서입니다' },
          { level: 2, text: '철학의 가장 첫 번째 단계는?' },
          { level: 3, text: '"자기 자신을 아는 것"이 시작입니다' },
        ],
      },
    ],
    social: [
      {
        difficulty_level: 2,
        topic: 'social',
        passage: '민주주의에서 투표는 시민의 핵심 권리이다. 투표 참여가 높아지면 정치인들은 더 넓은 계층의 이해를 반영해야 한다. 이는 정책의 대표성을 높여 사회 통합에 기여한다.',
        sentences: [
          { id: 'a', text: '투표 참여율이 높아진다' },
          { id: 'b', text: '정치인이 다양한 계층의 요구를 고려해야 한다' },
          { id: 'c', text: '정책의 대표성이 높아져 사회 통합이 강화된다' },
          { id: 'd', text: '투표율이 높으면 정치적 갈등이 사라진다' },
        ],
        conclusion: '높은 투표 참여는 민주주의의 질적 향상을 이끈다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '참여 → 반응 → 결과의 흐름입니다' },
          { level: 2, text: '투표율이 올라가면 정치인에게 어떤 변화가?' },
          { level: 3, text: '정치인의 반응이 중간 단계입니다' },
        ],
      },
      {
        difficulty_level: 2,
        topic: 'social',
        passage: '도시화가 진행되면 농촌 인구가 감소한다. 농촌 노동력 부족은 농업 생산성 저하로 이어진다. 이로 인해 식량 공급의 안정성이 위협받을 수 있다.',
        sentences: [
          { id: 'a', text: '도시화로 농촌 인구가 줄어든다' },
          { id: 'b', text: '농촌 노동력 부족이 농업 생산성을 낮춘다' },
          { id: 'c', text: '생산성 저하가 식량 공급 안정성을 위협한다' },
          { id: 'd', text: '도시화는 모든 경제 지표를 개선한다' },
        ],
        conclusion: '도시화의 부작용으로 식량 안보 문제가 대두될 수 있다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '인구 변화 → 노동력 → 생산 영향의 인과입니다' },
          { level: 2, text: '도시화의 첫 번째 영향은 어디에 나타나나요?' },
          { level: 3, text: '"농촌 인구 감소"가 시작점입니다' },
        ],
      },
    ],
    science: [
      {
        difficulty_level: 2,
        topic: 'science',
        passage: '지구 온난화로 극지방 빙하가 녹고 있다. 빙하 면적이 줄어들면 태양빛 반사율이 감소한다. 반사율 감소는 지표면의 열 흡수를 증가시켜 온난화를 가속하는 되먹임 현상을 만든다.',
        sentences: [
          { id: 'a', text: '온난화로 극지방 빙하가 녹아 면적이 줄어든다' },
          { id: 'b', text: '빙하 감소로 태양빛 반사율(알베도)이 낮아진다' },
          { id: 'c', text: '반사율 감소가 열 흡수를 높여 온난화를 가속한다' },
          { id: 'd', text: '빙하가 녹으면 기온이 자동으로 안정화된다' },
        ],
        conclusion: '빙하-알베도 되먹임은 온난화를 심화시키는 양의 피드백이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '빙하 감소 → 반사율 변화 → 온도 효과의 순환입니다' },
          { level: 2, text: '빙하가 줄어들면 물리적으로 무엇이 변하나요?' },
          { level: 3, text: '"태양빛 반사율 감소"가 핵심 중간 단계입니다' },
        ],
      },
      {
        difficulty_level: 2,
        topic: 'science',
        passage: '항생제 남용은 내성균 출현의 주요 원인이다. 약을 자주 사용하면 민감한 세균은 사라지지만 내성을 가진 세균이 살아남는다. 내성균이 우세해지면 기존 항생제로는 감염을 치료할 수 없게 된다.',
        sentences: [
          { id: 'a', text: '항생제를 과다하게 사용한다' },
          { id: 'b', text: '내성을 가진 세균만 선택적으로 생존한다' },
          { id: 'c', text: '내성균 확산으로 기존 항생제가 무력화된다' },
          { id: 'd', text: '항생제를 많이 쓸수록 건강에 좋다' },
        ],
        conclusion: '항생제 내성은 공중보건의 심각한 위협이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '남용 → 선택 → 결과의 진화적 과정입니다' },
          { level: 2, text: '항생제 사용 후 어떤 세균이 살아남나요?' },
          { level: 3, text: '"내성균 선택적 생존"이 중간 단계입니다' },
        ],
      },
    ],
    tech: [
      {
        difficulty_level: 2,
        topic: 'tech',
        passage: '머신러닝은 데이터에서 패턴을 학습하는 기술이다. 충분한 양의 학습 데이터가 주어지면 알고리즘이 특징을 추출하여 모델을 구축한다. 이 모델은 새로운 입력에 대해 예측을 수행할 수 있다.',
        sentences: [
          { id: 'a', text: '충분한 학습 데이터가 알고리즘에 입력된다' },
          { id: 'b', text: '알고리즘이 데이터에서 패턴과 특징을 추출한다' },
          { id: 'c', text: '학습된 모델이 새로운 데이터에 대해 예측을 수행한다' },
          { id: 'd', text: '데이터가 적을수록 더 정확한 모델이 만들어진다' },
        ],
        conclusion: '머신러닝은 데이터 기반 예측의 핵심 기술이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '입력 → 학습 → 출력의 순서입니다' },
          { level: 2, text: '학습이 이루어지려면 먼저 무엇이 필요한가요?' },
          { level: 3, text: '"학습 데이터 입력"이 첫 단계입니다' },
        ],
      },
      {
        difficulty_level: 2,
        topic: 'tech',
        passage: '클라우드 컴퓨팅은 인터넷을 통해 IT 자원을 제공하는 모델이다. 기업이 물리적 서버를 직접 관리할 필요 없이 필요한 만큼 컴퓨팅 자원을 사용할 수 있다. 이는 초기 투자 비용을 줄이고 유연한 확장을 가능하게 한다.',
        sentences: [
          { id: 'a', text: '클라우드를 통해 IT 자원을 인터넷으로 접근한다' },
          { id: 'b', text: '물리적 서버 구매 없이 필요한 만큼만 사용한다' },
          { id: 'c', text: '초기 비용 절감과 유연한 확장이 가능해진다' },
          { id: 'd', text: '클라우드는 보안 문제가 전혀 없다' },
        ],
        conclusion: '클라우드 컴퓨팅은 비용 효율적이고 확장 가능한 IT 솔루션이다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '접근 방식 → 사용 방식 → 경제 효과의 흐름입니다' },
          { level: 2, text: '클라우드의 기본적인 작동 원리는?' },
          { level: 3, text: '"인터넷을 통한 IT 자원 접근"이 시작입니다' },
        ],
      },
    ],
    arts: [
      {
        difficulty_level: 2,
        topic: 'arts',
        passage: '인상주의 화가들은 빛의 변화를 포착하는 데 집중했다. 야외에서 직접 그림을 그리며 시시각각 변하는 색채를 표현했다. 이러한 접근은 사실적 재현보다 순간적 인상을 중시하는 새로운 미학을 낳았다.',
        sentences: [
          { id: 'a', text: '인상주의 화가들이 빛과 색의 변화에 주목했다' },
          { id: 'b', text: '야외 작업(플레네르)으로 순간적 색채를 포착했다' },
          { id: 'c', text: '사실적 재현보다 감각적 인상을 중시하는 미학이 탄생했다' },
          { id: 'd', text: '인상주의는 실내에서만 그림을 그리는 방식이다' },
        ],
        conclusion: '인상주의는 빛의 표현을 통해 미술사에 새로운 방향을 제시했다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '관심사 → 방법 → 결과의 흐름입니다' },
          { level: 2, text: '인상주의자들이 가장 먼저 관심 가진 것은?' },
          { level: 3, text: '"빛과 색의 변화"가 출발점입니다' },
        ],
      },
      {
        difficulty_level: 2,
        topic: 'arts',
        passage: '사진의 발명은 미술의 역할을 재정의했다. 사실적 기록을 카메라가 대체하면서 화가들은 새로운 표현 영역을 모색해야 했다. 이러한 위기 의식이 추상 미술의 탄생을 촉진했다.',
        sentences: [
          { id: 'a', text: '사진이 사실적 기록의 역할을 대체했다' },
          { id: 'b', text: '화가들이 기록 이외의 새로운 표현을 모색했다' },
          { id: 'c', text: '새로운 표현의 탐구가 추상 미술의 출현으로 이어졌다' },
          { id: 'd', text: '사진의 발명으로 미술이 사라졌다' },
        ],
        conclusion: '사진 기술은 역설적으로 미술의 예술적 다양성을 촉진했다.',
        correct_chain: ['a', 'b', 'c'],
        hints: [
          { level: 1, text: '기술 변화 → 위기 → 혁신의 역사적 흐름입니다' },
          { level: 2, text: '사진이 미술에 처음 미친 영향은?' },
          { level: 3, text: '"사실적 기록 대체"가 시작점입니다' },
        ],
      },
    ],
  },

  3: groupByTopic(LEVEL3_QUESTIONS),
  4: groupByTopic(LEVEL4_QUESTIONS),
  5: groupByTopic(LEVEL5_QUESTIONS),
  6: groupByTopic(LEVEL6_QUESTIONS),
  7: groupByTopic(LEVEL7_QUESTIONS),
}

// ── Date-based pseudo-random selection ──────────
function dateHash(date: Date): number {
  const str = date.toISOString().slice(0, 10) // YYYY-MM-DD
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647
    const j = seed % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickQuestionsForLevel(
  level: number,
  count: number,
  date: Date,
): Question[] {
  const bank = QUESTION_BANK[level]
  if (!bank) return []

  const allQuestions: Question[] = []
  for (const topic of TOPICS) {
    if (bank[topic] && bank[topic].length > 0) {
      allQuestions.push(...bank[topic])
    }
  }

  if (allQuestions.length === 0) return []

  const seed = dateHash(date) + level * 1000
  const shuffled = shuffleWithSeed(allQuestions, seed)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

// ── Main handler ───────────────────────────────
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const today = new Date()

  const results: { level: number; inserted: number; errors: number }[] = []
  let totalInserted = 0
  let totalErrors = 0

  for (let level = 1; level <= 7; level++) {
    const questions = pickQuestionsForLevel(level, 10, today)

    if (questions.length === 0) {
      results.push({ level, inserted: 0, errors: 0 })
      continue
    }

    const rows = questions.map((q) => ({
      difficulty_level: q.difficulty_level,
      topic: q.topic,
      passage: q.passage,
      sentences: q.sentences,
      conclusion: q.conclusion,
      correct_chain: q.correct_chain,
      hints: q.hints,
    }))

    const { data, error } = await supabase
      .from('questions')
      .insert(rows)
      .select('id')

    if (error) {
      console.error(`[Cron] Level ${level} insert error:`, error.message)
      results.push({ level, inserted: 0, errors: questions.length })
      totalErrors += questions.length
    } else {
      const count = data?.length ?? 0
      results.push({ level, inserted: count, errors: 0 })
      totalInserted += count
    }
  }

  console.log(`[Cron] Daily question generation complete: ${totalInserted} inserted, ${totalErrors} errors`)

  return NextResponse.json({
    success: true,
    date: today.toISOString().slice(0, 10),
    total_inserted: totalInserted,
    total_errors: totalErrors,
    details: results,
  })
}
