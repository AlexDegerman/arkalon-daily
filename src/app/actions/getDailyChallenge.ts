'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import { getUtcDateString } from '@/lib/puzzles/hmac'
import { generateWithValidation } from '@/lib/puzzles/validateChallenge'
import type {
  PuzzleCategory,
  PuzzleSeedData,
  DailyPuzzleInfo
} from '@/types/puzzle'
import { getFamily } from '@/lib/puzzles/familyRegistry'

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
  savedScore?: number
  savedFamilyMetrics?: Record<string, unknown>
}

interface CachedPuzzlePayload {
  puzzleInfo: DailyPuzzleInfo
  seedData: PuzzleSeedData
}
const dailyChallengeCache = new Map<string, CachedPuzzlePayload>()

export async function getDailyChallenge(
  playerId: string,
  category: PuzzleCategory
): Promise<DailyChallengeResponse> {
  const parsed = Schema.safeParse({ playerId, category })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const todayUtc = getUtcDateString()
  const cacheKey = `${todayUtc}:${category}`

  try {
    // 1. Fetch player, existing result for today, and streak concurrently
    const [playerRow, existingResult, streakRow] = await Promise.all([
      pool.query<{ id: string; trials_completed: string[] }>(
        `SELECT id, trials_completed FROM players WHERE id = $1`,
        [playerId]
      ),
      pool.query<{
        normalized_score: number
        family_specific_metrics: Record<string, unknown>
      }>(
        `SELECT normalized_score, family_specific_metrics
         FROM daily_results
         WHERE player_id = $1 AND puzzle_date = $2 AND category = $3`,
        [playerId, todayUtc, category]
      ),
      pool.query<{ current_streak: number }>(
        `SELECT current_streak FROM category_streaks
         WHERE player_id = $1 AND category = $2`,
        [playerId, category]
      )
    ])

    if (playerRow.rows.length === 0) {
      return { success: false, error: 'Player not found' }
    }
    const player = playerRow.rows[0]
    const streakDays = streakRow.rows[0]?.current_streak ?? 0

    // 2. Resolve today's validated challenge data from memory cache or database
    let challenge = dailyChallengeCache.get(cacheKey)

    if (!challenge) {
      const puzzleRow = await pool.query<{
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
      const family = getFamily(puzzle.puzzle_family_id)
      if (!family) {
        return { success: false, error: 'Unknown puzzle family' }
      }

      challenge = {
        puzzleInfo: {
          puzzleDate: puzzle.puzzle_date,
          category: puzzle.category as PuzzleCategory,
          puzzleFamilyId: puzzle.puzzle_family_id,
          familyIndex: puzzle.family_index
        },
        seedData: generateWithValidation(puzzle.seed, family)
      }

      dailyChallengeCache.set(cacheKey, challenge)
    }

    // If already played today, return the stored score and metrics
    if (existingResult.rows.length > 0) {
      const saved = existingResult.rows[0]
      return {
        success: true,
        alreadyPlayed: true,
        puzzleInfo: challenge.puzzleInfo,
        seedData: challenge.seedData,
        streakDays,
        savedScore: saved.normalized_score,
        savedFamilyMetrics: saved.family_specific_metrics
      }
    }

    return {
      success: true,
      puzzleInfo: challenge.puzzleInfo,
      seedData: challenge.seedData,
      trialsCompleted: player.trials_completed,
      streakDays
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}