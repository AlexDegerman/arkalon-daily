'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import type { PlayerProfile, CategoryStats } from '@/types/puzzle'
import type { PuzzleCategory } from '@/types/puzzle'
import { CATEGORY_ORDER } from '@/constants/categories'

const Schema = z.object({
  playerId: z.string().uuid()
})

export interface GetPlayerProfileResult {
  success: boolean
  error?: string
  profile?: PlayerProfile
  stats?: CategoryStats[]
}

export async function getPlayerProfile(
  playerId: string
): Promise<GetPlayerProfileResult> {
  const parsed = Schema.safeParse({ playerId })
  if (!parsed.success) {
    return { success: false, error: 'Invalid player ID' }
  }

  const client = await pool.connect()
  try {
    // Fetch player row
    const playerRow = await client.query<{
      id: string
      display_name: string | null
      recovery_code: string
      created_at: string
      trials_completed: string[]
      recovery_tutorial_shown: boolean
    }>(
      `SELECT id, display_name, recovery_code, created_at::text,
              trials_completed, recovery_tutorial_shown
        FROM players
        WHERE id = $1`,
      [playerId]
    )

    if (playerRow.rows.length === 0) {
      return { success: false, error: 'Player not found' }
    }

    const p = playerRow.rows[0]
    const profile: PlayerProfile = {
      id: p.id,
      displayName: p.display_name,
      recoveryCode: p.recovery_code,
      createdAt: p.created_at,
      trialsCompleted: p.trials_completed,
      recoveryTutorialShown: p.recovery_tutorial_shown
    }

    // Update last_seen_at
    await client.query(
      `UPDATE players SET last_seen_at = now() WHERE id = $1`,
      [playerId]
    )

    // Fetch per-category stats
    const stats: CategoryStats[] = []

    for (const category of CATEGORY_ORDER) {
      const streakRow = await client.query<{
        current_streak: number
        longest_streak: number
      }>(
        `SELECT current_streak, longest_streak
          FROM category_streaks
          WHERE player_id = $1 AND category = $2`,
        [playerId, category]
      )

      const streak = streakRow.rows[0] ?? {
        current_streak: 0,
        longest_streak: 0
      }

      // Aggregate results - only include in averages if >= 3 submissions
      const aggRow = await client.query<{
        count: string
        best_score: number | null
        avg_score: number | null
      }>(
        `SELECT COUNT(*) AS count,
                MAX(normalized_score) AS best_score,
                AVG(normalized_score)::numeric(5,1) AS avg_score
          FROM daily_results
          WHERE player_id = $1 AND category = $2`,
        [playerId, category]
      )

      const agg = aggRow.rows[0]
      const daysPlayed = parseInt(agg.count, 10)
      const hasEnoughData = daysPlayed >= 3

      // Global percentile: fraction of players this player outscores on best day
      let globalPercentile: number | null = null
      if (agg.best_score !== null) {
        const percentileRow = await client.query<{ percentile: number }>(
          `SELECT ROUND(
             100.0 * RANK() OVER (ORDER BY MAX(normalized_score) DESC)
              / COUNT(*) OVER ()
            , 1) AS percentile
            FROM daily_results
            WHERE category = $1
            GROUP BY player_id
            HAVING player_id = $2
            LIMIT 1`,
          [category, playerId]
        )
        globalPercentile = percentileRow.rows[0]?.percentile ?? null
      }

      stats.push({
        category: category as PuzzleCategory,
        bestScore: agg.best_score ?? 0,
        averageScore: hasEnoughData
          ? parseFloat(agg.avg_score?.toString() ?? '0')
          : 0,
        daysPlayed,
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
        globalPercentile
      })
    }

    return { success: true, profile, stats }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
