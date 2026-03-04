import { LevelConfig } from '@/types'

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    name: '입문',
    slots: 3,
    hint_type: 'direct',
    description: '단순 인과관계, 일상 소재',
  },
  {
    level: 2,
    name: '기초',
    slots: 3,
    hint_type: 'direct',
    description: '부분적 추상 개념 포함',
  },
  {
    level: 3,
    name: '기초-중급',
    slots: 4,
    hint_type: 'semi',
    description: '수식어/종속절 포함 문장',
  },
  {
    level: 4,
    name: '중급',
    slots: 4,
    hint_type: 'semi',
    description: '실전 모의고사 수준',
  },
  {
    level: 5,
    name: '중상급',
    slots: 5,
    hint_type: 'indirect',
    description: '복잡한 논리 구조 (대조/역전)',
  },
  {
    level: 6,
    name: '고급',
    slots: 6,
    hint_type: 'indirect',
    description: '수능 실전 난이도',
  },
  {
    level: 7,
    name: '마스터',
    slots: 7,
    hint_type: 'none',
    description: '고난도 추상 지문, 힌트 없음',
  },
]

export const LEVEL_UP_ACCURACY = 0.8
export const LEVEL_UP_SESSIONS = 3
export const FREE_DAILY_LIMIT = 5
export const INVITE_BONUS_QUESTIONS = 2

export function getLevelConfig(level: number): LevelConfig {
  return LEVEL_CONFIGS[Math.min(level, 7) - 1]
}
