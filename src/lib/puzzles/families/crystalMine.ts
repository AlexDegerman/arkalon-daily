import 'server-only'

import { nextInt, shuffle } from '@/lib/puzzles/seededRandom'
import { DEPTHS_BASE_CONFIGS } from '@/lib/puzzles/baseConfigs/depths'
import {
  calcChargeLimit,
  calcClueTileCount,
  DEPOSIT_PATTERNS
} from '@/lib/puzzles/compositionSystem'
import {
  registerValidator,
  validateDepthsSolvability
} from '@/lib/puzzles/validateChallenge'
import type {
  PuzzleFamilyDefinition,
  PuzzleSeedData,
  ResultMetricDefinition
} from '@/types/puzzle'
import type { ClueTypeId } from '@/types/puzzle'
import type { DepositPatternId } from '@/lib/puzzles/compositionSystem'
import { seedToRng } from '../generateChallenge'

export interface GridCell {
  row: number
  col: number
  isDeposit: boolean
  isClue: boolean
  clueValue: number | string | null
  isRevealed: boolean // pre-revealed clue tiles start true
}

export interface CrystalMineData {
  gridSize: number
  grid: GridCell[][]
  depositCount: number
  chargeLimit: number
  clueType: ClueTypeId
  depositPattern: DepositPatternId
}

// Manhattan distance between two grid positions
function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2)
}

// Returns the clue value for a clue tile at (row, col) given deposit positions
function computeClueValue(
  row: number,
  col: number,
  deposits: { row: number; col: number }[],
  clueType: ClueTypeId,
  gridSize: number
): string | number {
  switch (clueType) {
    case 'numeric': {
      const minDist = Math.min(
        ...deposits.map((d) => manhattan(row, col, d.row, d.col))
      )
      return minDist
    }
    case 'directional': {
      // Sort deposits by Manhattan distance, then by row then col for tiebreaking
      const sorted = [...deposits].sort((a, b) => {
        const da = manhattan(row, col, a.row, a.col)
        const db = manhattan(row, col, b.row, b.col)
        if (da !== db) return da - db
        if (a.col !== b.col) return a.col - b.col
        return a.row - b.row
      })
      const nearest = sorted[0]
      if (!nearest) return '?'
      const dr = nearest.row - row
      const dc = nearest.col - col
      if (dr === 0 && dc === 0) return '\u25C6' // on deposit
      const angle = Math.atan2(dr, dc) * (180 / Math.PI)
      if (angle >= -22.5 && angle < 22.5) return '\u2192'
      if (angle >= 22.5 && angle < 67.5) return '\u2198'
      if (angle >= 67.5 && angle < 112.5) return '\u2193'
      if (angle >= 112.5 && angle < 157.5) return '\u2199'
      if (angle >= 157.5 || angle < -157.5) return '\u2190'
      if (angle >= -157.5 && angle < -112.5) return '\u2196'
      if (angle >= -112.5 && angle < -67.5) return '\u2191'
      return '\u2197'
    }
    case 'hot_cold': {
      const minDist = Math.min(
        ...deposits.map((d) => manhattan(row, col, d.row, d.col))
      )
      if (minDist <= 1) return 'HOT'
      if (minDist <= 3) return 'WARM'
      return 'COLD'
    }
    case 'adjacency_count': {
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = row + dr
          const nc = col + dc
          if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
            if (deposits.some((d) => d.row === nr && d.col === nc)) count++
          }
        }
      }
      return count
    }
  }
}

// Places deposits according to the deposit pattern template
function placeDeposits(
  rng: () => number,
  gridSize: number,
  depositCount: number,
  pattern: DepositPatternId
): { row: number; col: number }[] {
  const allCells: { row: number; col: number }[] = []
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++) allCells.push({ row: r, col: c })

  let pool: { row: number; col: number }[]

  switch (pattern) {
    case 'scattered': {
      pool = shuffle(rng, allCells)
      break
    }
    case 'clustered': {
      const anchor = {
        row: nextInt(rng, gridSize),
        col: nextInt(rng, gridSize)
      }
      pool = shuffle(rng, allCells).sort(
        (a, b) =>
          manhattan(a.row, a.col, anchor.row, anchor.col) -
          manhattan(b.row, b.col, anchor.row, anchor.col)
      )
      break
    }
    case 'diagonal_line': {
      const diag = allCells.filter(
        (c) => c.row === c.col || c.row === gridSize - 1 - c.col
      )
      pool = shuffle(rng, diag.length >= depositCount ? diag : allCells)
      break
    }
    case 'edges_only': {
      const edges = allCells.filter(
        (c) =>
          c.row === 0 ||
          c.row === gridSize - 1 ||
          c.col === 0 ||
          c.col === gridSize - 1
      )
      pool = shuffle(rng, edges.length >= depositCount ? edges : allCells)
      break
    }
    case 'center_mass': {
      const mid = Math.floor(gridSize / 2)
      const radius = Math.floor(gridSize / 3) + 1
      const center = allCells.filter(
        (c) =>
          Math.abs(c.row - mid) <= radius && Math.abs(c.col - mid) <= radius
      )
      pool = shuffle(rng, center.length >= depositCount ? center : allCells)
      break
    }
    case 'corners': {
      const cornerCells = allCells.filter(
        (c) =>
          (c.row <= 1 && c.col <= 1) ||
          (c.row <= 1 && c.col >= gridSize - 2) ||
          (c.row >= gridSize - 2 && c.col <= 1) ||
          (c.row >= gridSize - 2 && c.col >= gridSize - 2)
      )
      pool = shuffle(
        rng,
        cornerCells.length >= depositCount ? cornerCells : allCells
      )
      break
    }
    case 'l_shape': {
      const arm1 = allCells.filter(
        (c) => c.row < Math.ceil(gridSize / 2) && c.col < 2
      )
      const arm2 = allCells.filter(
        (c) => c.row >= Math.ceil(gridSize / 2) - 1 && c.col < gridSize
      )
      const lCells = [...arm1, ...arm2]
      const unique = lCells.filter(
        (c, i, a) =>
          a.findIndex((x) => x.row === c.row && x.col === c.col) === i
      )
      pool = shuffle(rng, unique.length >= depositCount ? unique : allCells)
      break
    }
    case 'split': {
      const half = Math.floor(gridSize / 2)
      const leftCells = allCells.filter((c) => c.col < half)
      const rightCells = allCells.filter((c) => c.col >= half + 1)
      const leftPick = shuffle(rng, leftCells).slice(
        0,
        Math.ceil(depositCount / 2)
      )
      const rightPick = shuffle(rng, rightCells).slice(
        0,
        Math.floor(depositCount / 2)
      )
      return [...leftPick, ...rightPick]
    }
    default:
      pool = shuffle(rng, allCells)
  }

  return pool.slice(0, depositCount)
}

function generate(seed: string): PuzzleSeedData {
  const rng = seedToRng(seed)
  const base = DEPTHS_BASE_CONFIGS[nextInt(rng, DEPTHS_BASE_CONFIGS.length)]
  const {
    gridSize,
    depositCount,
    clueType,
    depositPattern,
    startTileRevealed
  } = base

  const chargeLimit = calcChargeLimit(gridSize, depositCount, clueType)
  const numClueTiles = calcClueTileCount(gridSize, depositCount)

  // Place deposits
  const deposits = placeDeposits(rng, gridSize, depositCount, depositPattern)
  const depositSet = new Set(deposits.map((d) => `${d.row},${d.col}`))

  // Build empty grid
  const grid: GridCell[][] = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => ({
      row: r,
      col: c,
      isDeposit: depositSet.has(`${r},${c}`),
      isClue: false,
      clueValue: null,
      isRevealed: false
    }))
  )

  // Place clue tiles on non-deposit cells
  // Ensure at least one clue is within Manhattan distance 2 of each deposit
  const nonDepositCells = []
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      if (!depositSet.has(`${r},${c}`)) nonDepositCells.push({ row: r, col: c })

  const clueSet = new Set<string>()

  // First pass: guarantee coverage of each deposit
  for (const dep of deposits) {
    const near = nonDepositCells.filter(
      (c) =>
        manhattan(c.row, c.col, dep.row, dep.col) <= 2 &&
        !clueSet.has(`${c.row},${c.col}`)
    )
    if (near.length > 0) {
      const pick = near[nextInt(rng, near.length)]
      clueSet.add(`${pick.row},${pick.col}`)
    }
  }

  // Fill remaining clue slots from shuffled non-deposit cells
  const shuffledNonDeposit = shuffle(rng, nonDepositCells)
  for (const cell of shuffledNonDeposit) {
    if (clueSet.size >= numClueTiles) break
    clueSet.add(`${cell.row},${cell.col}`)
  }

  // Apply clue values and reveal state
  for (const key of clueSet) {
    const [r, c] = key.split(',').map(Number)
    const cell = grid[r]?.[c]
    if (!cell) continue
    cell.isClue = true
    cell.clueValue = computeClueValue(r, c, deposits, clueType, gridSize)
    cell.isRevealed = true
  }

  // startTileRevealed: reveal the deposit nearest to the grid center
  if (startTileRevealed && deposits.length > 0) {
    const mid = (gridSize - 1) / 2
    const nearest = [...deposits].sort(
      (a, b) =>
        manhattan(a.row, a.col, mid, mid) - manhattan(b.row, b.col, mid, mid)
    )[0]
    if (nearest) {
      const cell = grid[nearest.row]?.[nearest.col]
      if (cell) cell.isRevealed = true
    }
  }

  const familyData: CrystalMineData = {
    gridSize,
    grid,
    depositCount,
    chargeLimit,
    clueType,
    depositPattern
  }

  return {
    profile: {
      gridSize,
      chargeLimit,
      clueType,
      depositPattern: DEPOSIT_PATTERNS.indexOf(depositPattern)
    },
    familyData: familyData as unknown as Record<string, unknown>
  }
}

const RESULT_METRICS: ResultMetricDefinition[] = [
  { key: 'depositsFound', label: 'Deposits Found', format: 'integer' },
  { key: 'chargesUsed', label: 'Charges Used', format: 'integer' },
  { key: 'efficiencyPct', label: 'Efficiency', format: 'percent' },
  { key: 'completionTimeMs', label: 'Completion Time', format: 'time' }
]

export const CrystalMineFamily: PuzzleFamilyDefinition = {
  id: 'crystal_mine',
  displayName: 'Crystal Mine',
  category: 'depths',
  generate,
  resultMetrics: RESULT_METRICS,
  scoringModel: 'logic-first'
}

registerValidator('crystal_mine', (data) => {
  const fam = data.familyData as unknown as CrystalMineData
  const flatCells = fam.grid.flat()

  const result = validateDepthsSolvability(
    fam.grid.map((row) =>
      row.map((c) => ({
        isDeposit: c.isDeposit,
        isClue: c.isClue,
        clueValue: c.clueValue
      }))
    ),
    fam.gridSize,
    fam.chargeLimit,
    fam.depositCount,
    fam.clueType
  )
  if (!result.valid) return result

  // Reject if no clue tiles placed
  if (!flatCells.some((c) => c.isClue)) {
    return { valid: false, reason: 'No clue tiles placed' }
  }

  // Reject if hot_cold clues give no useful coverage:
  // every hot_cold clue must have at least one deposit within distance 3
  if (fam.clueType === 'hot_cold') {
    const deposits = flatCells.filter((c) => c.isDeposit)
    const clueTiles = flatCells.filter((c) => c.isClue)
    const anyNearDeposit = clueTiles.some((clue) =>
      deposits.some(
        (dep) =>
          Math.abs(clue.row - dep.row) + Math.abs(clue.col - dep.col) <= 3
      )
    )
    if (!anyNearDeposit) {
      return {
        valid: false,
        reason:
          'Hot/cold clues provide no WARM or HOT signals - grid is effectively unsolvable'
      }
    }
  }

  // Reject all-corners deposit pattern on a 5x5 grid with hot_cold clues:
  // deposits are too spread for hot_cold to give useful signal
  if (
    fam.depositPattern === 'corners' &&
    fam.gridSize === 5 &&
    fam.clueType === 'hot_cold'
  ) {
    return {
      valid: false,
      reason:
        'Corners pattern on 5x5 with hot_cold clues produces degenerate layout'
    }
  }

  return { valid: true }
})
