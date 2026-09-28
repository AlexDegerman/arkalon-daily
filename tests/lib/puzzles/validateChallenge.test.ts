import { describe, it, expect } from 'vitest'
import {
  registerValidator,
  validateChallenge,
  generateWithValidation,
  validateDepthsSolvability
} from '@/lib/puzzles/validateChallenge'
import type { DepthsGridCell } from '@/lib/puzzles/validateChallenge'
import { ArkalonVisionFamily } from '@/lib/puzzles/families/arkalonVision'
import type { PuzzleFamilyDefinition } from '@/types/puzzle'

function buildDepthsGrid(
  gridSize: number,
  deposits: Array<[number, number]>,
  clues: Array<{ row: number; col: number; value: number | string }>
): DepthsGridCell[][] {
  return Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => {
      const isDeposit = deposits.some(([dr, dc]) => dr === r && dc === c)
      const clue = clues.find((cl) => cl.row === r && cl.col === c)
      return {
        isDeposit,
        isClue: Boolean(clue),
        clueValue: clue ? clue.value : null
      }
    })
  )
}

describe('validateDepthsSolvability', () => {
  it('accepts a solvable numeric grid', () => {
    // Clue at 0,0 with value 4 eliminates 10 tiles (distance < 4).
    // 25 - 10 = 15 possible tiles remaining.
    // chargeLimit must be >= 15 to pass the unsolvable check.
    const grid = buildDepthsGrid(5, [[2, 2]], [{ row: 0, col: 0, value: 4 }])
    const result = validateDepthsSolvability(grid, 5, 15, 1, 'numeric')
    expect(result.valid).toBe(true)
  })

  it('accepts a solvable hot_cold grid', () => {
    const grid = buildDepthsGrid(
      5,
      [[2, 2]],
      [{ row: 2, col: 3, value: 'HOT' }]
    )
    const result = validateDepthsSolvability(grid, 5, 6, 1, 'hot_cold')
    expect(result.valid).toBe(true)
  })

  it('rejects more deposits than charges', () => {
    const grid = buildDepthsGrid(
      5,
      [
        [1, 1],
        [2, 2],
        [3, 3]
      ],
      []
    )
    const result = validateDepthsSolvability(grid, 5, 2, 3, 'numeric')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('More deposits than charges')
  })

  it('rejects clues that eliminate an actual deposit', () => {
    // Clue at 0,0 with value 1 eliminates 0,0 (distance 0 < 1).
    // Deposit is at 0,0. chargeLimit is 25 to bypass the "Unsolvable" tile count check.
    const grid = buildDepthsGrid(5, [[0, 0]], [{ row: 0, col: 0, value: 1 }])
    const result = validateDepthsSolvability(grid, 5, 25, 1, 'numeric')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('eliminate an actual deposit')
  })

  it('rejects grids with more possible tiles than charges', () => {
    const grid = buildDepthsGrid(5, [[2, 2]], [])
    const result = validateDepthsSolvability(grid, 5, 3, 1, 'numeric')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Unsolvable')
  })
})

describe('validator registry', () => {
  it('accepts challenges for families with no registered validator', () => {
    const data = { profile: {}, familyData: {} }
    expect(validateChallenge('nonexistent_family', data).valid).toBe(true)
  })

  it('runs a registered custom validator', () => {
    registerValidator('test_family', (data) => {
      const fam = data.familyData as { flag?: boolean }
      return fam.flag
        ? { valid: true }
        : { valid: false, reason: 'flag not set' }
    })
    expect(
      validateChallenge('test_family', {
        profile: {},
        familyData: { flag: true }
      }).valid
    ).toBe(true)

    const bad = validateChallenge('test_family', {
      profile: {},
      familyData: { flag: false }
    })
    expect(bad.valid).toBe(false)
    expect(bad.reason).toBe('flag not set')
  })
})

describe('generateWithValidation', () => {
  it('returns a valid challenge for a real family', () => {
    const data = generateWithValidation('a1b2c3d4e5f60718', ArkalonVisionFamily)
    expect(validateChallenge('arkalon_vision', data).valid).toBe(true)
  })

  it('retries with derived seeds until validation passes', () => {
    let attempts = 0
    const flakyFamily: PuzzleFamilyDefinition = {
      id: 'flaky_family',
      displayName: 'Flaky',
      category: 'recall',
      generate: () => {
        attempts++
        return { profile: {}, familyData: { attempt: attempts } }
      },
      resultMetrics: [],
      scoringModel: 'continuous'
    }
    registerValidator('flaky_family', (data) => {
      const fam = data.familyData as { attempt: number }
      return fam.attempt >= 3
        ? { valid: true }
        : { valid: false, reason: 'not yet' }
    })
    const data = generateWithValidation('deadbeef', flakyFamily)
    expect(attempts).toBe(3)
    expect((data.familyData as { attempt: number }).attempt).toBe(3)
  })

  it('throws after maxAttempts if validation never passes', () => {
    const alwaysFailFamily: PuzzleFamilyDefinition = {
      id: 'always_fail_family',
      displayName: 'Always Fail',
      category: 'recall',
      generate: (seed) => ({ profile: {}, familyData: { seed } }),
      resultMetrics: [],
      scoringModel: 'continuous'
    }
    registerValidator('always_fail_family', () => ({
      valid: false,
      reason: 'never'
    }))
    expect(() =>
      generateWithValidation('beefdead', alwaysFailFamily, 5)
    ).toThrow(/Could not generate a valid challenge/)
  })
})
