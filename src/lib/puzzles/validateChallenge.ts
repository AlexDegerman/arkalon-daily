import 'server-only'

import type {
  PuzzleSeedData,
  PuzzleFamilyDefinition,
  ClueTypeId
} from '@/types/puzzle'
import { generateChallenge } from './generateChallenge'

export interface ValidationResult {
  valid: boolean
  reason?: string
}

// Each family may export a validator. If absent, the challenge is accepted.
export type ChallengeValidator = (data: PuzzleSeedData) => ValidationResult

// Registry of per-family validators - populated by family modules.
const VALIDATORS = new Map<string, ChallengeValidator>()

export function registerValidator(
  familyId: string,
  fn: ChallengeValidator
): void {
  VALIDATORS.set(familyId, fn)
}

export function validateChallenge(
  familyId: string,
  data: PuzzleSeedData
): ValidationResult {
  const validator = VALIDATORS.get(familyId)
  if (!validator) return { valid: true }
  return validator(data)
}

// Generates a deterministic challenge and retries with derived seeds
// until family validation passes. Retries remain deterministic so all
// players receive the same accepted challenge for the same seed.
export function generateWithValidation(
  baseSeed: string,
  family: PuzzleFamilyDefinition,
  maxAttempts = 20
): PuzzleSeedData {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const trySeed =
      attempt === 0
        ? baseSeed
        : attempt.toString(16).padStart(2, '0') + baseSeed.slice(2)
    const data = generateChallenge(trySeed, family)
    const result = validateChallenge(family.id, data)
    if (result.valid) return data
  }
  throw new Error(
    `Could not generate a valid challenge for family "${family.id}" after ${maxAttempts} attempts`
  )
}

// Validates that the generated grid can be completed within the charge limit.
export interface DepthsGridCell {
  isDeposit: boolean
  isClue: boolean
  clueValue?: number | string | null
}
export function validateDepthsSolvability(
  grid: DepthsGridCell[][],
  gridSize: number,
  chargeLimit: number,
  depositCount: number,
  clueType: ClueTypeId
): ValidationResult {
  if (depositCount > chargeLimit) {
    return { valid: false, reason: 'More deposits than charges' }
  }
  const possible = grid.map((row) => row.map((cell) => !cell.isClue))
  const arrowOf = (dr: number, dc: number): string => {
    if (dr === 0 && dc > 0) return '\u2192'
    if (dr > 0 && dc > 0) return '\u2198'
    if (dr > 0 && dc === 0) return '\u2193'
    if (dr > 0 && dc < 0) return '\u2199'
    if (dr === 0 && dc < 0) return '\u2190'
    if (dr < 0 && dc < 0) return '\u2196'
    if (dr < 0 && dc === 0) return '\u2191'
    return '\u2197'
  }
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const clue = grid[r]?.[c]
      if (!clue || !clue.isClue) continue
      if (clue.clueValue === null || clue.clueValue === undefined) continue
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          if (!possible[y][x]) continue
          const dr = y - r
          const dc = x - c
          const d = Math.abs(dr) + Math.abs(dc)
          if (clueType === 'numeric') {
            if (d !== clue.clueValue) possible[y][x] = false
          } else if (clueType === 'hot_cold') {
            const band = d === 1 ? 'HOT' : d <= 3 ? 'WARM' : 'COLD'
            if (band !== clue.clueValue) possible[y][x] = false
          } else if (clueType === 'directional') {
            if (d === 0 || arrowOf(dr, dc) !== clue.clueValue) {
              possible[y][x] = false
            }
          } else if (clueType === 'adjacency_count') {
            // A zero count eliminates its neighborhood outright; higher
            // counts constrain combinations, not single tiles.
            if (
              clue.clueValue === 0 &&
              Math.abs(dr) <= 1 &&
              Math.abs(dc) <= 1
            ) {
              possible[y][x] = false
            }
          }
        }
      }
    }
  }
  const remaining = possible.flat().filter(Boolean).length
  if (remaining > chargeLimit) {
    return {
      valid: false,
      reason: `Unsolvable: ${remaining} possible tiles but only ${chargeLimit} charges`
    }
  }
  const depositsPossible = grid.every((row, r) =>
    row.every((cell, c) => !cell.isDeposit || possible[r][c])
  )
  if (!depositsPossible) {
    return { valid: false, reason: 'Clues eliminate an actual deposit' }
  }
  return { valid: true }
}