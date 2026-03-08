import { describe, it, expect } from 'vitest'
import {
  LEVEL_CONFIGS,
  LEVEL_UP_ACCURACY,
  LEVEL_UP_SESSIONS,
  FREE_DAILY_LIMIT,
  getLevelConfig,
} from '@/lib/game/levelConfig'

describe('LEVEL_CONFIGS', () => {
  it('has exactly 7 levels', () => {
    expect(LEVEL_CONFIGS).toHaveLength(7)
  })

  it('levels are numbered 1-7', () => {
    LEVEL_CONFIGS.forEach((config, i) => {
      expect(config.level).toBe(i + 1)
    })
  })

  it('slot counts increase with level', () => {
    const slots = LEVEL_CONFIGS.map((c) => c.slots)
    // Each level's slots should be >= previous level
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]).toBeGreaterThanOrEqual(slots[i - 1])
    }
  })

  it('level 7 has no hints', () => {
    const level7 = LEVEL_CONFIGS[6]
    expect(level7.hint_type).toBe('none')
  })

  it('level 1 has direct hints', () => {
    const level1 = LEVEL_CONFIGS[0]
    expect(level1.hint_type).toBe('direct')
  })
})

describe('getLevelConfig', () => {
  it('returns correct config for each level', () => {
    for (let i = 1; i <= 7; i++) {
      const config = getLevelConfig(i)
      expect(config.level).toBe(i)
    }
  })

  it('clamps level to max 7', () => {
    const config = getLevelConfig(10)
    expect(config.level).toBe(7)
  })
})

describe('constants', () => {
  it('LEVEL_UP_ACCURACY is 80%', () => {
    expect(LEVEL_UP_ACCURACY).toBe(0.8)
  })

  it('LEVEL_UP_SESSIONS is 3', () => {
    expect(LEVEL_UP_SESSIONS).toBe(3)
  })

  it('FREE_DAILY_LIMIT is 5', () => {
    expect(FREE_DAILY_LIMIT).toBe(5)
  })
})
