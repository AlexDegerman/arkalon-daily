'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import { CATEGORY_ORDER } from '@/constants/categories'
import type { CategoryStats, PuzzleCategory } from '@/types/puzzle'

const Schema = z.object({ playerId: z.string().uuid() })

export interface GetStatisticsResult {
  success: boolean
  error?: string
  stats?: CategoryStats[]
}

export async function getStatistics(
  playerId: string
): Promise<GetStatisticsResult> {
  const parsed = Schema.safeParse({ playerId })
  if (!parsed.success) {
    return { success: false, error: 'Invalid player ID' }
  }

  const client = await pool.connect()
  try {
    const playerRow = await client.query(
      `SELECT id FROM players WHERE id = $1`,
      [playerId]
    )
    if (playerRow.rows.length === 0) {
      return { success: false, error: 'Player not found' }
    }

    const stats: CategoryStats[] = []

    for (const category of CATEGORY_ORDER) {
      // Aggregate scores
      const aggRow = await client.query<{
        count: string
        best_score: number | null
        avg_score: string | null
      }>(
        `SELECT COUNT(*) AS count,
                MAX(normalized_score) AS best_score,
                AVG(normalized_score)::numeric(5,1) AS avg_score
          FROM daily_results
          WHERE player_id = $1 AND category = $2`,
        [playerId, category]
      )

      const agg = aggRow.rows[0]
      const daysPlayed = parseInt(agg?.count ?? '0', 10)
      const hasEnoughData = daysPlayed >= 3

      // Streaks
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

      // Global percentile based on best score
      let globalPercentile: number | null = null
      if (agg?.best_score != null) {
        const pctRow = await client.query<{ pct: string }>(
          `SELECT ROUND(
             100.0 * SUM(CASE WHEN best <= $1 THEN 1 ELSE 0 END) / COUNT(*)
            , 1) AS pct
            FROM (
              SELECT MAX(normalized_score) AS best
              FROM daily_results
              WHERE category = $2
              GROUP BY player_id
            ) sub`,
          [agg.best_score, category]
        )
        const pct = parseFloat(pctRow.rows[0]?.pct ?? '0')
        globalPercentile = isNaN(pct) ? null : pct
      }

      stats.push({
        category: category as PuzzleCategory,
        bestScore: agg?.best_score ?? 0,
        averageScore: hasEnoughData ? parseFloat(agg?.avg_score ?? '0') : 0,
        daysPlayed,
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
        globalPercentile
      })
    }

    return { success: true, stats }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
