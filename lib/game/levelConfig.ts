import { LevelConfig } from '@/types'

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    name: '기초',
    slots: 3,
    hint_type: 'direct',
    description: '기본 인과관계, 명확한 논리 흐름',
  },
  {
    level: 2,
    name: '중급',
    slots: 3,
    hint_type: 'semi',
    description: '추상 개념 포함, 수식어/종속절 문장',
  },
  {
    level: 3,
    name: '중상급',
    slots: 4,
    hint_type: 'semi',
    description: '복합 논증, 대조/역전 논리',
  },
  {
    level: 4,
    name: '고급',
    slots: 4,
    hint_type: 'indirect',
    description: '모의고사 수준, 긴 지문',
  },
  {
    level: 5,
    name: '실전',
    slots: 5,
    hint_type: 'indirect',
    description: '대조/역전 논리, 수능 실전',
  },
  {
    level: 6,
    name: '심화',
    slots: 5,
    hint_type: 'indirect',
    description: '수능 실전 수준, 긴 지문',
  },
  {
    level: 7,
    name: '마스터',
    slots: 5,
    hint_type: 'none',
    description: '논문급 고난도 지문, 힌트 없음',
  },
]

export const LEVEL_UP_ACCURACY = 0.8
export const LEVEL_UP_SESSIONS = 3
export const FREE_DAILY_LIMIT = 5
export const INVITE_BONUS_QUESTIONS = 2

// 힌트 포인트 경제
export const DAILY_HINT_RECHARGE = 3      // 매일 자동 충전량
export const MAX_HINT_POINTS = 30          // 최대 보유 한도
export const CORRECT_ANSWER_HINT_BONUS = 1 // 정답 시 보너스

export function getLevelConfig(level: number): LevelConfig {
  return LEVEL_CONFIGS[Math.min(level, 7) - 1]
}
