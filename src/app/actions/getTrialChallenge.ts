'use server'
import 'server-only'
import { z } from 'zod'
import pool from '@/lib/db'
import { TRIAL_SEEDS } from '@/lib/puzzles/trialSeeds'
import { generateWithValidation } from '@/lib/puzzles/validateChallenge'
import { getFamilyForCategory } from '@/lib/puzzles/familyRegistry'
import type { PuzzleCategory, PuzzleSeedData } from '@/types/puzzle'

const Schema = z.object({
  playerId: z.string().uuid(),
  category: z.enum(['recall', 'surge', 'cipher', 'strike', 'depths'])
})

export interface TrialChallengeResponse {
  success: boolean
  error?: string
  seedData?: PuzzleSeedData
}

export async function getTrialChallenge(
  playerId: string,
  category: PuzzleCategory
): Promise<TrialChallengeResponse> {
  const parsed = Schema.safeParse({ playerId, category })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const client = await pool.connect()
  try {
    const row = await client.query('SELECT id FROM players WHERE id = $1', [
      playerId
    ])
    if (row.rows.length === 0) {
      return { success: false, error: 'Player not found' }
    }
  } finally {
    client.release()
  }

  const family = getFamilyForCategory(category)
  const trialSeed = TRIAL_SEEDS[category]
  let seedData = generateWithValidation(trialSeed, family)
  let attempt = 0

  // Each category enforces trial-specific constraints. Trials introduce the
  // core mechanic without advanced modifiers or unexpected difficulty spikes.
  while (attempt < 20) {
    let acceptable = true

    if (category === 'surge') {
      // Trial requires decoy nodes because the explainer teaches avoiding them.
      const hasDecoy = (
        (seedData.familyData as { nodes?: { isDecoy: boolean }[] }).nodes ?? []
      ).some((n) => n.isDecoy)
      // Reject splitting behavior and fast_long timing to keep first attempts accessible.
      const profile = seedData.profile as {
        targetBehavior?: string
        timingProfile?: string
      }
      const isSafeDifficulty =
        profile.targetBehavior !== 'splitting' &&
        profile.timingProfile !== 'fast_long'
      acceptable = hasDecoy && isSafeDifficulty
    }

    if (category === 'strike') {
      // Reject deceptive motion because feints are reserved for daily challenges.
      const profile = seedData.profile as {
        motionFunction?: string
        targetWindowPx?: number
      }
      // Require a minimum target window for first-contact playability.
      acceptable =
        profile.motionFunction !== 'deceptive' &&
        (profile.targetWindowPx ?? 0) >= 40
    }

    if (category === 'recall') {
      // Reverse entry is reserved for daily challenges and is not covered by the trial explainer.
      const familyData = seedData.familyData as { reverseEntry?: boolean }
      acceptable = !familyData.reverseEntry
    }

    if (category === 'cipher') {
      // Reject advanced generators that use different interaction patterns.
      // The trial uses the standard sequence puzzle format..
      const familyData = seedData.familyData as {
        rounds?: { generator: string }[]
      }
      const hasComplexGenerator = (familyData.rounds ?? []).some(
        (r) =>
          r.generator === 'rule_discovery' ||
          r.generator === 'constrained_choice'
      )
      acceptable = !hasComplexGenerator
    }

    if (category === 'depths') {
      // Trial uses numeric clues because the explainer describes distance-based clues.
      // Limit grid size to keep the first puzzle readable.
      const profile = seedData.profile as {
        clueType?: string
        gridSize?: number
      }
      acceptable =
        profile.clueType === 'numeric' && (profile.gridSize ?? 5) <= 6
    }

    if (acceptable) break

    attempt++
    // Derive deterministic trial variants while keeping the same seed format.
    const derived = attempt.toString(16).padStart(2, '0') + trialSeed.slice(2)
    seedData = generateWithValidation(derived, family)
  }

  return { success: true, seedData }
}
