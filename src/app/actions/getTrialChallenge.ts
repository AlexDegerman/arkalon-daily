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
  const seedData = generateWithValidation(trialSeed, family)

  return { success: true, seedData }
}
