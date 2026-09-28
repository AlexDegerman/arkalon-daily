import { describe, it, expect } from 'vitest'
import { mulberry32 } from '@/lib/puzzles/seededRandom'
import { generateRound } from '@/lib/puzzles/patternGenerators'
import type { PatternGeneratorId } from '@/types/puzzle'

const VALID_SHAPES = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'hexagon',
  'star'
]
const VALID_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
const VALID_SIZES = ['small', 'medium', 'large']

const GENERATORS: PatternGeneratorId[] = [
  'alternating',
  'dual_variable',
  'tri_variable',
  'rule_discovery',
  'constrained_choice'
]

describe('generateRound', () => {
  it('always includes the correct answer among the choices', () => {
    for (const generator of GENERATORS) {
      for (let seed = 1; seed <= 20; seed++) {
        const round = generateRound(mulberry32(seed), generator, 5, 4)
        const found = round.choices.some(
          (c) =>
            c.shape === round.correctAnswer.shape &&
            c.color === round.correctAnswer.color &&
            c.size === round.correctAnswer.size
        )
        expect(found, `${generator} @ seed ${seed}`).toBe(true)
      }
    }
  })

  it('builds choice counts to match the requested choiceCount', () => {
    for (const generator of GENERATORS) {
      for (const choiceCount of [4, 5, 6]) {
        const round = generateRound(mulberry32(9), generator, 5, choiceCount)
        expect(round.choices, generator).toHaveLength(choiceCount)
      }
    }
  })

  it('only emits valid shapes, colors, and sizes', () => {
    for (const generator of GENERATORS) {
      for (let seed = 1; seed <= 20; seed++) {
        const round = generateRound(mulberry32(seed), generator, 5, 4)
        const elements = [
          ...round.shownElements,
          ...round.choices,
          round.correctAnswer
        ]
        for (const el of elements) {
          expect(VALID_SHAPES).toContain(el.shape)
          expect(VALID_COLORS).toContain(el.color)
          expect(VALID_SIZES).toContain(el.size)
        }
      }
    }
  })

  it('is deterministic for identical RNG streams', () => {
    for (const generator of GENERATORS) {
      const a = generateRound(mulberry32(42), generator, 5, 4)
      const b = generateRound(mulberry32(42), generator, 5, 4)
      expect(a).toEqual(b)
    }
  })

  it('falls back to alternating for unhandled generators', () => {
    const round = generateRound(mulberry32(3), 'rotation_mirror', 5, 4)
    expect(round.generator).toBe('alternating')
  })
})

describe('alternating', () => {
  it('alternates shapes while holding color and size constant', () => {
    const round = generateRound(mulberry32(7), 'alternating', 5, 4)
    const shown = round.shownElements
    expect(shown).toHaveLength(5)
    const first = shown[0]
    for (const el of shown) {
      expect(el.color).toBe(first.color)
      expect(el.size).toBe(first.size)
    }
    expect(shown[0].shape).not.toBe(shown[1].shape)
    for (let i = 2; i < shown.length; i++) {
      expect(shown[i].shape).toBe(shown[i - 2].shape)
    }
    expect(round.correctAnswer.shape).toBe(shown[1].shape)
  })
})

describe('dual_variable', () => {
  it('cycles shape with period 3 and color with period 2', () => {
    const round = generateRound(mulberry32(11), 'dual_variable', 5, 4)
    const shown = round.shownElements
    expect(shown).toHaveLength(5)
    expect(round.correctAnswer.shape).toBe(shown[5 % 3].shape)
    expect(round.correctAnswer.color).toBe(shown[5 % 2].color)
  })
})

describe('tri_variable', () => {
  it('cycles shape, color, and size simultaneously with variable periods', () => {
    const round = generateRound(mulberry32(13), 'tri_variable', 5, 4)
    const shown = round.shownElements
    expect(shown).toHaveLength(5)

    // shapePeriod is 3, 4, or 5
    let shapePeriod = 3
    if (shown[0].shape === shown[4].shape) {
      shapePeriod = 4
    } else if (shown[0].shape !== shown[3].shape) {
      shapePeriod = 5
    }

    // colorPeriod is 2 or 3
    const colorPeriod = shown[0].color === shown[2].color ? 2 : 3

    // sizePeriod is 2 or 3
    const sizePeriod = shown[0].size === shown[2].size ? 2 : 3

    expect(round.correctAnswer.shape).toBe(shown[5 % shapePeriod].shape)
    expect(round.correctAnswer.color).toBe(shown[5 % colorPeriod].color)
    expect(round.correctAnswer.size).toBe(shown[5 % sizePeriod].size)
  })
})

describe('rule_discovery', () => {
  it('builds rounds from yes/no example sets with a consistent answer', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const round = generateRound(mulberry32(seed), 'rule_discovery', 5, 4)
      expect(round.yesExamples).toHaveLength(3)
      expect(round.noExamples).toHaveLength(2)
      expect(round.choices).toHaveLength(4)

      // Verify correct answer is in choices
      const found = round.choices.some(
        (c) =>
          c.shape === round.correctAnswer.shape &&
          c.color === round.correctAnswer.color &&
          c.size === round.correctAnswer.size
      )
      expect(found).toBe(true)

      // Verify correct answer is not in noExamples
      const noKeys = new Set(
        round.noExamples!.map((e) => `${e.shape}-${e.color}-${e.size}`)
      )
      expect(
        noKeys.has(
          `${round.correctAnswer.shape}-${round.correctAnswer.color}-${round.correctAnswer.size}`
        )
      ).toBe(false)
    }
  })
})

describe('constrained_choice', () => {
  it('produces 3 or 4 constraints and a valid answer', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const round = generateRound(mulberry32(seed), 'constrained_choice', 5, 4)
      expect(round.constraints).toBeDefined()
      expect(round.constraints!.length).toBeGreaterThanOrEqual(3)
      expect(round.constraints!.length).toBeLessThanOrEqual(4)
      expect(round.constraints!.every((c) => typeof c === 'string')).toBe(true)

      // Verify correct answer is in choices
      const found = round.choices.some(
        (c) =>
          c.shape === round.correctAnswer.shape &&
          c.color === round.correctAnswer.color &&
          c.size === round.correctAnswer.size
      )
      expect(found).toBe(true)
    }
  })
})
