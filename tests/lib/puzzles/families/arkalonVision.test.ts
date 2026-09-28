import { describe, it, expect } from 'vitest'
import { ArkalonVisionFamily } from '@/lib/puzzles/families/arkalonVision'
import type { ArkalonVisionData } from '@/lib/puzzles/families/arkalonVision'
import { validateChallenge } from '@/lib/puzzles/validateChallenge'
import { RECALL_GLYPHS } from '@/lib/puzzles/compositionSystem'
import type { PuzzleSeedData } from '@/types/puzzle'

const SEED = 'a1b2c3d4e5f60718'

describe('ArkalonVisionFamily definition', () => {
  it('registers under recall with the continuous scoring model', () => {
    expect(ArkalonVisionFamily.id).toBe('arkalon_vision')
    expect(ArkalonVisionFamily.category).toBe('recall')
    expect(ArkalonVisionFamily.scoringModel).toBe('continuous')
    expect(ArkalonVisionFamily.resultMetrics.map((m) => m.key)).toEqual([
      'accuracyPercent',
      'maxSequence',
      'errors',
      'completionTimeMs'
    ])
  })
})

describe('generate', () => {
  it('produces three rounds drawn only from the active glyph pool', () => {
    const data = ArkalonVisionFamily.generate(SEED)
    const fam = data.familyData as unknown as ArkalonVisionData
    expect(fam.rounds).toHaveLength(3)
    expect(fam.glyphPool).toEqual(
      Array.from(RECALL_GLYPHS).slice(0, data.profile.glyphPool)
    )
    for (const round of fam.rounds) {
      expect(round.sequence.length).toBeGreaterThan(0)
      for (const glyph of round.sequence) {
        expect(fam.glyphPool).toContain(glyph)
      }
      expect(round.keypadOrder).toHaveLength(fam.glyphPool.length)
    }
  })

  it('clamps the per-glyph display duration to 500-1000ms across seeds', () => {
    for (let i = 0; i < 25; i++) {
      const seed = (i * 7919 + 1).toString(16).padStart(8, '0')
      const data = ArkalonVisionFamily.generate(seed)
      expect(data.profile.displayDurationMs).toBeGreaterThanOrEqual(500)
      expect(data.profile.displayDurationMs).toBeLessThanOrEqual(1000)
    }
  })

  it('keeps round durations within the engagement variance band', () => {
    const fam = ArkalonVisionFamily.generate(SEED)
      .familyData as unknown as ArkalonVisionData
    for (const round of fam.rounds) {
      const perGlyph = round.displayDurationMs / round.sequence.length
      expect(perGlyph).toBeGreaterThanOrEqual(500 * 0.92 - 1)
      expect(perGlyph).toBeLessThanOrEqual(1000 * 1.08 + 1)
    }
  })

  it('is deterministic for the same seed and diverges across seeds', () => {
    const a = ArkalonVisionFamily.generate(SEED)
    const b = ArkalonVisionFamily.generate(SEED)
    expect(a).toEqual(b)
    const c = ArkalonVisionFamily.generate('00000002')
    expect(a).not.toEqual(c)
  })
})

describe('validator', () => {
  const POOL = ['\u25C6', '\u25B2', '\u25CF', '\u25A0']

  function makeData(
    overrides: Partial<ArkalonVisionData> = {},
    profileMs = 800
  ): PuzzleSeedData {
    return {
      profile: { displayDurationMs: profileMs },
      familyData: {
        rounds: [
          {
            sequence: ['\u25C6', '\u25B2', '\u25CF'],
            displayDurationMs: 2400,
            keypadOrder: POOL
          }
        ],
        glyphPool: POOL,
        randomizedLayout: false,
        reverseEntry: false,
        ...overrides
      } as unknown as Record<string, unknown>
    }
  }

  it('accepts a well-formed challenge', () => {
    expect(validateChallenge('arkalon_vision', makeData()).valid).toBe(true)
  })

  it('rejects profile per-glyph durations under 500ms', () => {
    const result = validateChallenge('arkalon_vision', makeData({}, 400))
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('too short')
  })

  it('rejects rounds whose per-glyph time drops below 450ms', () => {
    const data = makeData({
      rounds: [
        {
          sequence: ['\u25C6', '\u25B2', '\u25CF'],
          displayDurationMs: 1200,
          keypadOrder: POOL
        }
      ]
    })
    expect(validateChallenge('arkalon_vision', data).valid).toBe(false)
  })

  it('rejects glyphs outside the active pool', () => {
    const data = makeData({
      rounds: [
        {
          sequence: ['\u25C6', '\u2605'],
          displayDurationMs: 2400,
          keypadOrder: POOL
        }
      ]
    })
    const result = validateChallenge('arkalon_vision', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('not in active pool')
  })

  it('accepts every challenge the generator can produce', () => {
    for (let i = 0; i < 10; i++) {
      const seed = (i * 7919).toString(16).padStart(8, '0')
      const data = ArkalonVisionFamily.generate(seed)
      expect(validateChallenge('arkalon_vision', data).valid).toBe(true)
    }
  })
})
