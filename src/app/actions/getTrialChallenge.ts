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
      // Reject splitting behavior and extreme pacing to keep first attempts accessible.
      const profile = seedData.profile as {
        targetBehavior?: string
        timingProfile?: string
      }
      const isSafeDifficulty =
        profile.targetBehavior !== 'splitting' &&
        (profile.timingProfile === 'ramp' ||
          profile.timingProfile === 'wave' ||
          profile.timingProfile === 'slow_short')
      acceptable = hasDecoy && isSafeDifficulty
    }

    if (category === 'strike') {
      // Restrict trial to smooth, predictable motion with wide windows and moderate speeds.
      const profile = seedData.profile as {
        motionFunction?: string
        targetWindowPx?: number
        movementSpeed?: number
      }
      acceptable =
        profile.motionFunction === 'linear' &&
        (profile.targetWindowPx ?? 0) >= 40 &&
        (profile.movementSpeed ?? 0) <= 1.9
    }

    if (category === 'recall') {
      // Stable, unshuffled keypad and forward sequence only for first-contact onboarding.
      const familyData = seedData.familyData as {
        reverseEntry?: boolean
        randomizedLayout?: boolean
      }
      const profile = seedData.profile as { sequenceLength?: number }
      acceptable =
        !familyData.reverseEntry &&
        !familyData.randomizedLayout &&
        (profile.sequenceLength ?? 0) <= 8
    }

    if (category === 'cipher') {
      // Untimed standard sequence matching so new players can study colors and shapes without timer panic.
      const familyData = seedData.familyData as {
        rounds?: { generator: string }[]
      }
      const profile = seedData.profile as { timerSeconds?: number | null }
      const hasComplexGenerator = (familyData.rounds ?? []).some(
        (r) =>
          r.generator === 'rule_discovery' ||
          r.generator === 'constrained_choice'
      )
      acceptable = !hasComplexGenerator && profile.timerSeconds === null
    }

    if (category === 'depths') {
      // Trial locked strictly to a 5x5 grid with numeric clues for instant readability.
      const profile = seedData.profile as {
        clueType?: string
        gridSize?: number
      }
      acceptable =
        profile.clueType === 'adjacency_count' && (profile.gridSize ?? 0) <= 6
    }

    if (acceptable) break

    attempt++
    // Derive deterministic trial variants while keeping the same seed format.
    const derived = attempt.toString(16).padStart(2, '0') + trialSeed.slice(2)
    seedData = generateWithValidation(derived, family)
  }

  return { success: true, seedData }
}
