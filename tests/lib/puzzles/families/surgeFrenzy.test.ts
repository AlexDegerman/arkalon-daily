import { describe, it, expect } from 'vitest'
import { SurgeFrenzyFamily } from '@/lib/puzzles/families/surgeFrenzy'
import type { SurgeFrenzyData } from '@/lib/puzzles/families/surgeFrenzy'
import { validateChallenge } from '@/lib/puzzles/validateChallenge'
import { getSessionDurationMs } from '@/lib/puzzles/compositionSystem'
import type { PuzzleSeedData } from '@/types/puzzle'

const SEED = 'b2c3d4e5f6071829'

describe('SurgeFrenzyFamily definition', () => {
  it('registers under surge with the speed-first scoring model', () => {
    expect(SurgeFrenzyFamily.id).toBe('surge_frenzy')
    expect(SurgeFrenzyFamily.category).toBe('surge')
    expect(SurgeFrenzyFamily.scoringModel).toBe('speed-first')
  })
})

describe('generate', () => {
  it('produces nodes sorted by spawn time inside the play area', () => {
    const fam = SurgeFrenzyFamily.generate(SEED)
      .familyData as unknown as SurgeFrenzyData
    expect(fam.nodes.length).toBeGreaterThanOrEqual(5)
    for (let i = 1; i < fam.nodes.length; i++) {
      expect(fam.nodes[i].spawnAtMs).toBeGreaterThanOrEqual(
        fam.nodes[i - 1].spawnAtMs
      )
    }
    for (const node of fam.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(40)
      expect(node.x).toBeLessThanOrEqual(560)
      expect(node.y).toBeGreaterThanOrEqual(40)
      expect(node.y).toBeLessThanOrEqual(360)
      expect(node.lifetimeMs).toBeGreaterThan(0)
    }
  })

  it('counts only non-decoy nodes toward the expected total', () => {
    const fam = SurgeFrenzyFamily.generate(SEED)
      .familyData as unknown as SurgeFrenzyData
    const nonDecoys = fam.nodes.filter((n) => !n.isDecoy).length
    expect(fam.expectedNodeCount).toBe(nonDecoys)
  })

  it('never spawns decoys when the config disables them', () => {
    for (let i = 0; i < 20; i++) {
      const seed = (i * 104729 + 5).toString(16).padStart(8, '0')
      const fam = SurgeFrenzyFamily.generate(seed)
        .familyData as unknown as SurgeFrenzyData
      if (!fam.hasDecoyTargets) {
        expect(fam.nodes.every((n) => !n.isDecoy)).toBe(true)
      }
    }
  })

  it('matches the session duration to the timing profile', () => {
    for (let i = 0; i < 20; i++) {
      const seed = (i * 15485863 + 3).toString(16).padStart(8, '0')
      const fam = SurgeFrenzyFamily.generate(seed)
        .familyData as unknown as SurgeFrenzyData
      expect(fam.sessionDurationMs).toBe(
        getSessionDurationMs(fam.timingProfile)
      )
    }
  })

  it('is deterministic for the same seed and diverges across seeds', () => {
    const a = SurgeFrenzyFamily.generate(SEED)
    const b = SurgeFrenzyFamily.generate(SEED)
    expect(a).toEqual(b)
    expect(a).not.toEqual(SurgeFrenzyFamily.generate('00000002'))
  })
})

describe('validator', () => {
  function makeSurgeData(
    overrides: Partial<SurgeFrenzyData> = {}
  ): PuzzleSeedData {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: 100,
      y: 100,
      spawnAtMs: i * 700,
      lifetimeMs: 1500,
      isDecoy: false,
      behavior: 'stationary' as const,
      initialRadius: 24
    }))
    const base: SurgeFrenzyData = {
      nodes,
      spawnPattern: 'single',
      targetBehavior: 'stationary',
      timingProfile: 'ramp',
      spatialLayout: 'grid',
      hasDecoyTargets: false,
      sessionDurationMs: 60_000,
      expectedNodeCount: 10
    }
    return {
      profile: {},
      familyData: { ...base, ...overrides } as unknown as Record<
        string,
        unknown
      >
    }
  }

  it('accepts a healthy session', () => {
    expect(validateChallenge('surge_frenzy', makeSurgeData()).valid).toBe(true)
  })

  it('rejects sessions with fewer than five nodes', () => {
    const data = makeSurgeData({ nodes: [], expectedNodeCount: 0 })
    expect(validateChallenge('surge_frenzy', data).valid).toBe(false)
  })

  it('rejects sessions with too few scorable nodes', () => {
    const data = makeSurgeData({ expectedNodeCount: 2 })
    const result = validateChallenge('surge_frenzy', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('non-decoy')
  })

  it('rejects decoy ratios above 40%', () => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: 100,
      y: 100,
      spawnAtMs: i * 700,
      lifetimeMs: 1500,
      isDecoy: i < 5,
      behavior: 'stationary' as const,
      initialRadius: 24
    }))
    const data = makeSurgeData({
      nodes,
      expectedNodeCount: 5,
      hasDecoyTargets: true
    })
    const result = validateChallenge('surge_frenzy', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Decoy ratio')
  })

  it('rejects pressure timing combined with splitting targets', () => {
    const data = makeSurgeData({
      timingProfile: 'pressure',
      targetBehavior: 'splitting'
    })
    expect(validateChallenge('surge_frenzy', data).valid).toBe(false)
  })
})
