import { describe, it, expect } from 'vitest'
import { CrystalMineFamily } from '@/lib/puzzles/families/crystalMine'
import type {
  CrystalMineData,
  GridCell
} from '@/lib/puzzles/families/crystalMine'
import { validateChallenge } from '@/lib/puzzles/validateChallenge'
import { calcChargeLimit } from '@/lib/puzzles/compositionSystem'
import type { ClueTypeId, PuzzleSeedData } from '@/types/puzzle'

const SEED = 'e5f60718293a4b5c'

describe('CrystalMineFamily definition', () => {
  it('registers under depths with the logic-first scoring model', () => {
    expect(CrystalMineFamily.id).toBe('crystal_mine')
    expect(CrystalMineFamily.category).toBe('depths')
    expect(CrystalMineFamily.scoringModel).toBe('logic-first')
  })
})

describe('generate', () => {
  it('builds a square grid matching the base config', () => {
    const data = CrystalMineFamily.generate(SEED)
    const fam = data.familyData as unknown as CrystalMineData
    expect(fam.grid).toHaveLength(fam.gridSize)
    for (const row of fam.grid) {
      expect(row).toHaveLength(fam.gridSize)
    }
    expect(data.profile.gridSize).toBe(fam.gridSize)
  })

  it('places exactly depositCount deposits and gridSize + depositCount clues', () => {
    for (let i = 0; i < 10; i++) {
      const seed = (i * 7919 + 1).toString(16).padStart(8, '0')
      const fam = CrystalMineFamily.generate(seed)
        .familyData as unknown as CrystalMineData
      const flat = fam.grid.flat()
      expect(flat.filter((c) => c.isDeposit)).toHaveLength(fam.depositCount)
      const clues = flat.filter((c) => c.isClue)
      expect(clues).toHaveLength(fam.gridSize + fam.depositCount)
      for (const clue of clues) {
        expect(clue.isDeposit).toBe(false)
        expect(clue.isRevealed).toBe(true)
        expect(clue.clueValue).not.toBeNull()
      }
    }
  })

  it('derives the charge limit from grid size, deposits, and clue type', () => {
    for (let i = 0; i < 10; i++) {
      const seed = (i * 104729 + 7).toString(16).padStart(8, '0')
      const fam = CrystalMineFamily.generate(seed)
        .familyData as unknown as CrystalMineData
      expect(fam.chargeLimit).toBe(
        calcChargeLimit(fam.gridSize, fam.depositCount, fam.clueType)
      )
    }
  })

  it('emits clue values consistent with the clue type', () => {
    for (let i = 0; i < 15; i++) {
      const seed = (i * 15485863 + 3).toString(16).padStart(8, '0')
      const fam = CrystalMineFamily.generate(seed)
        .familyData as unknown as CrystalMineData
      for (const cell of fam.grid.flat()) {
        if (!cell.isClue) continue
        if (fam.clueType === 'numeric') {
          expect(typeof cell.clueValue).toBe('number')
        } else if (fam.clueType === 'adjacency_count') {
          expect(typeof cell.clueValue).toBe('number')
          expect(cell.clueValue as number).toBeLessThanOrEqual(8)
        } else if (fam.clueType === 'hot_cold') {
          expect(['HOT', 'WARM', 'COLD']).toContain(cell.clueValue)
        } else {
          expect(typeof cell.clueValue).toBe('string')
        }
      }
    }
  })

  it('is deterministic for the same seed and diverges across seeds', () => {
    const a = CrystalMineFamily.generate(SEED)
    const b = CrystalMineFamily.generate(SEED)
    expect(a).toEqual(b)
    expect(a).not.toEqual(CrystalMineFamily.generate('00000002'))
  })
})

describe('validator', () => {
  function buildGrid(
    gridSize: number,
    deposits: [number, number][],
    clues: { row: number; col: number; value: number | string }[]
  ): GridCell[][] {
    return Array.from({ length: gridSize }, (_, r) =>
      Array.from({ length: gridSize }, (_, c) => {
        const isDeposit = deposits.some(([dr, dc]) => dr === r && dc === c)
        const clue = clues.find((cl) => cl.row === r && cl.col === c)
        return {
          row: r,
          col: c,
          isDeposit,
          isClue: Boolean(clue),
          clueValue: clue ? clue.value : null,
          isRevealed: Boolean(clue)
        }
      })
    )
  }

  function makeDepthsData(options: {
    grid: GridCell[][]
    gridSize: number
    depositCount: number
    chargeLimit: number
    clueType: ClueTypeId
    depositPattern?: CrystalMineData['depositPattern']
  }): PuzzleSeedData {
    const fam: CrystalMineData = {
      gridSize: options.gridSize,
      grid: options.grid,
      depositCount: options.depositCount,
      chargeLimit: options.chargeLimit,
      clueType: options.clueType,
      depositPattern: options.depositPattern ?? 'scattered'
    }
    return {
      profile: {},
      familyData: fam as unknown as Record<string, unknown>
    }
  }

  it('accepts a solvable numeric grid', () => {
    const data = makeDepthsData({
      grid: buildGrid(5, [[2, 2]], [{ row: 0, col: 0, value: 4 }]),
      gridSize: 5,
      depositCount: 1,
      chargeLimit: 15,
      clueType: 'numeric'
    })
    expect(validateChallenge('crystal_mine', data).valid).toBe(true)
  })

  it('rejects more deposits than charges', () => {
    const data = makeDepthsData({
      grid: buildGrid(
        5,
        [
          [1, 1],
          [2, 2],
          [3, 3]
        ],
        [{ row: 0, col: 0, value: 2 }]
      ),
      gridSize: 5,
      depositCount: 3,
      chargeLimit: 2,
      clueType: 'numeric'
    })
    const result = validateChallenge('crystal_mine', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('More deposits than charges')
  })

  it('rejects clues that eliminate an actual deposit', () => {
    const data = makeDepthsData({
      grid: buildGrid(5, [[0, 1]], [{ row: 0, col: 0, value: 5 }]),
      gridSize: 5,
      depositCount: 1,
      chargeLimit: 10,
      clueType: 'numeric'
    })
    const result = validateChallenge('crystal_mine', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('eliminate an actual deposit')
  })

  it('rejects grids with too many possible tiles for the charge budget', () => {
    const data = makeDepthsData({
      grid: buildGrid(5, [[2, 2]], [{ row: 0, col: 0, value: 4 }]),
      gridSize: 5,
      depositCount: 1,
      chargeLimit: 3,
      clueType: 'numeric'
    })
    const result = validateChallenge('crystal_mine', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Unsolvable')
  })

  it('rejects clue-free grids', () => {
    const data = makeDepthsData({
      grid: buildGrid(5, [[2, 2]], []),
      gridSize: 5,
      depositCount: 1,
      chargeLimit: 25,
      clueType: 'numeric'
    })
    const result = validateChallenge('crystal_mine', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('No clue tiles')
  })

  it('rejects hot_cold layouts that give no WARM or HOT signal', () => {
    const data = makeDepthsData({
      grid: buildGrid(
        5,
        [
          [4, 0],
          [0, 4]
        ],
        [{ row: 2, col: 2, value: 'COLD' }]
      ),
      gridSize: 5,
      depositCount: 2,
      chargeLimit: 25,
      clueType: 'hot_cold'
    })
    const result = validateChallenge('crystal_mine', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('no WARM or HOT')
  })

  it('rejects the degenerate corners pattern on 5x5 with hot_cold clues', () => {
    const data = makeDepthsData({
      grid: buildGrid(
        5,
        [
          [0, 0],
          [4, 4]
        ],
        [{ row: 2, col: 2, value: 'COLD' }]
      ),
      gridSize: 5,
      depositCount: 2,
      chargeLimit: 25,
      clueType: 'hot_cold',
      depositPattern: 'corners'
    })
    const result = validateChallenge('crystal_mine', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('no WARM or HOT')
  })

  it('rejects adjacency_count zero clues that cover a real deposit', () => {
    const data = makeDepthsData({
      grid: buildGrid(5, [[2, 3]], [{ row: 2, col: 2, value: 0 }]),
      gridSize: 5,
      depositCount: 1,
      chargeLimit: 25,
      clueType: 'adjacency_count'
    })
    const result = validateChallenge('crystal_mine', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('eliminate an actual deposit')
  })
})
