import { describe, it, expect } from 'vitest'
import { SniperChallengeFamily } from '@/lib/puzzles/families/sniperChallenge'
import type { SniperChallengeData } from '@/lib/puzzles/families/sniperChallenge'
import { validateChallenge } from '@/lib/puzzles/validateChallenge'
import type { PuzzleSeedData } from '@/types/puzzle'

const SEED = 'd4e5f60718293a4b'

describe('SniperChallengeFamily definition', () => {
  it('registers under strike with the speed-first scoring model', () => {
    expect(SniperChallengeFamily.id).toBe('sniper_challenge')
    expect(SniperChallengeFamily.category).toBe('strike')
    expect(SniperChallengeFamily.scoringModel).toBe('speed-first')
  })
})

describe('generate', () => {
  it('pre-generates one shot config per shot with targets in bounds', () => {
    const fam = SniperChallengeFamily.generate(SEED)
      .familyData as unknown as SniperChallengeData
    expect(fam.shots).toHaveLength(fam.shotCount)
    for (const shot of fam.shots) {
      // Targets avoid the outer 50px of each edge
      expect(shot.targetCenterX).toBeGreaterThanOrEqual(50)
      expect(shot.targetCenterX).toBeLessThanOrEqual(550)
      expect(shot.freqHz).toBeGreaterThanOrEqual(0.3)
      expect(shot.freqHz).toBeLessThanOrEqual(0.8)
      expect(shot.targetWindowPx).toBe(fam.targetWindowPx)
    }
  })

  it('never narrows the target window below 12px', () => {
    for (let i = 0; i < 25; i++) {
      const seed = (i * 7919 + 11).toString(16).padStart(8, '0')
      const fam = SniperChallengeFamily.generate(seed)
        .familyData as unknown as SniperChallengeData
      expect(fam.targetWindowPx).toBeGreaterThanOrEqual(12)
      expect(fam.movementSpeed).toBeGreaterThan(0)
    }
  })

  it('is deterministic for the same seed and diverges across seeds', () => {
    const a = SniperChallengeFamily.generate(SEED)
    const b = SniperChallengeFamily.generate(SEED)
    expect(a).toEqual(b)
    expect(a).not.toEqual(SniperChallengeFamily.generate('00000002'))
  })
})

describe('validator', () => {
  function makeStrikeData(
    overrides: Partial<SniperChallengeData> = {}
  ): PuzzleSeedData {
    const base: SniperChallengeData = {
      shots: Array.from({ length: 12 }, () => ({
        targetCenterX: 300,
        targetWindowPx: 60,
        freqHz: 0.5
      })),
      shotCount: 12,
      movementSpeed: 1.2,
      motionFunction: 'linear',
      targetWindowPx: 60,
      timingWindowMs: 300
    }
    return {
      profile: {},
      familyData: { ...base, ...overrides } as unknown as Record<
        string,
        unknown
      >
    }
  }

  it('accepts a fair configuration', () => {
    expect(validateChallenge('sniper_challenge', makeStrikeData()).valid).toBe(
      true
    )
  })

  it('rejects fewer than five shots', () => {
    const data = makeStrikeData({ shotCount: 4, shots: [] })
    const result = validateChallenge('sniper_challenge', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Too few shots')
  })

  it('rejects target windows under 12px', () => {
    const data = makeStrikeData({ targetWindowPx: 10 })
    expect(validateChallenge('sniper_challenge', data).valid).toBe(false)
  })

  it('rejects deceptive motion at 2.5x+ speed with windows under 25px', () => {
    const data = makeStrikeData({
      motionFunction: 'deceptive',
      movementSpeed: 2.5,
      targetWindowPx: 20
    })
    const result = validateChallenge('sniper_challenge', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('not fair')
  })

  it('allows deceptive motion below the speed or window thresholds', () => {
    const slower = makeStrikeData({
      motionFunction: 'deceptive',
      movementSpeed: 2.4,
      targetWindowPx: 20
    })
    const wider = makeStrikeData({
      motionFunction: 'deceptive',
      movementSpeed: 2.6,
      targetWindowPx: 25
    })
    expect(validateChallenge('sniper_challenge', slower).valid).toBe(true)
    expect(validateChallenge('sniper_challenge', wider).valid).toBe(true)
  })
})
