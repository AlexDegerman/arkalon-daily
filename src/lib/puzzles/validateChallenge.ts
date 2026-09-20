import 'server-only'

import type { PuzzleSeedData, PuzzleFamilyDefinition } from '@/types/puzzle'
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
        : baseSeed.slice(0, -2) + attempt.toString(16).padStart(2, '0')

    const data = generateChallenge(trySeed, family)
    const result = validateChallenge(family.id, data)

    if (result.valid) return data
  }

  throw new Error(
    `Could not generate a valid challenge for family "${family.id}" after ${maxAttempts} attempts`
  )
}

// Shared interestingness check used by multiple family validators.
// Rejects axis combinations where all continuous parameters are at
// their minimum or maximum, producing a monotone challenge.
export function isMonotone(
  values: number[],
  min: number,
  max: number
): boolean {
  return values.every((v) => v === min) || values.every((v) => v === max)
}

// Validates that the generated grid can be completed within the charge limit.
export interface DepthsGridCell {
  isDeposit: boolean
  isClue: boolean
  clueValue?: number | string
}

export function validateDepthsSolvability(
  grid: DepthsGridCell[][],
  gridSize: number,
  chargeLimit: number,
  depositCount: number
): ValidationResult {
  // Count tiles that are still "possible deposit" locations
  // after eliminating based on clue constraints.
  // This is a heuristic approximation - the exact constraint propagation
  // is done per-clue-type in the full validator registered by crystalMine.ts.
  let unknownTiles = 0
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r]?.[c]
      if (cell && !cell.isClue && !cell.isDeposit) {
        unknownTiles++
      }
    }
  }

  if (unknownTiles + depositCount > chargeLimit) {
    return {
      valid: false,
      reason: `Unsolvable: ${unknownTiles} unknown tiles but only ${chargeLimit - depositCount} spare charges`
    }
  }

  return { valid: true }
}
