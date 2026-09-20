'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import { getUtcDateString } from '@/lib/puzzles/hmac'
import { generateWithValidation } from '@/lib/puzzles/validateChallenge'
import { ArkalonVisionFamily } from '@/lib/puzzles/families/arkalonVision'
import type {
  PuzzleCategory,
  PuzzleSeedData,
  DailyPuzzleInfo
} from '@/types/puzzle'

const Schema = z.object({
  playerId: z.string().uuid(),
  category: z.enum(['recall', 'surge', 'cipher', 'strike', 'depths'])
})

export interface DailyChallengeResponse {
  success: boolean
  error?: string
  puzzleInfo?: DailyPuzzleInfo
  seedData?: PuzzleSeedData
  alreadyPlayed?: boolean
  trialsCompleted?: string[]
  streakDays?: number
}

// Family map - extended in Commit 5.5 when all families exist
function getFamilyDefinition(familyId: string) {
  switch (familyId) {
    case 'arkalon_vision':
      return ArkalonVisionFamily
    default:
      return null
  }
}

export async function getDailyChallenge(
  playerId: string,
  category: PuzzleCategory
): Promise<DailyChallengeResponse> {
  const parsed = Schema.safeParse({ playerId, category })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const client = await pool.connect()
  try {
    // Validate player exists and get trial/milestone state
    const playerRow = await client.query<{
      id: string
      trials_completed: string[]
    }>(`SELECT id, trials_completed FROM players WHERE id = $1`, [playerId])
    if (playerRow.rows.length === 0) {
      return { success: false, error: 'Player not found' }
    }
    const player = playerRow.rows[0]

    // Check if already played today
    const todayUtc = getUtcDateString()
    const existingResult = await client.query(
      `SELECT normalized_score FROM daily_results
       WHERE player_id = $1 AND puzzle_date = $2 AND category = $3`,
      [playerId, todayUtc, category]
    )
    if (existingResult.rows.length > 0) {
      return { success: true, alreadyPlayed: true }
    }

    // Load today's daily_puzzles row
    const puzzleRow = await client.query<{
      puzzle_date: string
      category: string
      puzzle_family_id: string
      family_index: number
      seed: string
    }>(
      `SELECT puzzle_date::text, category, puzzle_family_id, family_index, seed
        FROM daily_puzzles
        WHERE puzzle_date = $1 AND category = $2`,
      [todayUtc, category]
    )

    if (puzzleRow.rows.length === 0) {
      return {
        success: false,
        error: 'No puzzle generated for today yet. Try again shortly.'
      }
    }

    const puzzle = puzzleRow.rows[0]

    // Generate resolved seed data server-side - seed never leaves the server
    const family = getFamilyDefinition(puzzle.puzzle_family_id)
    if (!family) {
      return { success: false, error: 'Unknown puzzle family' }
    }

    const seedData = generateWithValidation(puzzle.seed, family)

    // Fetch current streak for display
    const streakRow = await client.query<{ current_streak: number }>(
      `SELECT current_streak FROM category_streaks
        WHERE player_id = $1 AND category = $2`,
      [playerId, category]
    )
    const streakDays = streakRow.rows[0]?.current_streak ?? 0

    const puzzleInfo: DailyPuzzleInfo = {
      puzzleDate: puzzle.puzzle_date,
      category: puzzle.category as PuzzleCategory,
      puzzleFamilyId: puzzle.puzzle_family_id,
      familyIndex: puzzle.family_index
    }

    return {
      success: true,
      puzzleInfo,
      seedData,
      trialsCompleted: player.trials_completed,
      streakDays
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
