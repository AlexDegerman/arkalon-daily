import 'server-only'

import type { PoolClient } from 'pg'
import { STREAK_MIN_SCORE } from './scoring'

// Recomputes the current streak for a player+category by walking backward
// from today through consecutive UTC dates that have a result with score >= 15.
// A failed submission (score < 15) breaks the streak.
// Returns { currentStreak, longestStreak }.
export async function recomputeStreak(
  client: PoolClient,
  playerId: string,
  category: string
): Promise<{ currentStreak: number; longestStreak: number }> {
  // Fetch all results for this player+category ordered by date descending
  const rows = await client.query<{
    puzzle_date: string
    normalized_score: number
  }>(
    `SELECT puzzle_date::text, normalized_score
      FROM daily_results
      WHERE player_id = $1 AND category = $2
      ORDER BY puzzle_date DESC`,
    [playerId, category]
  )

  if (rows.rows.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Walk backward from today counting consecutive qualifying dates
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let currentStreak = 0
  let longestStreak = 0
  let runStreak = 0
  let expectedDate = new Date(today)

  for (const row of rows.rows) {
    const rowDate = new Date(row.puzzle_date + 'T00:00:00Z')
    const dayDiff =
      (expectedDate.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24)

    const qualifies = row.normalized_score >= STREAK_MIN_SCORE

    if (dayDiff === 0) {
      // This is the expected date
      if (qualifies) {
        runStreak++
        if (currentStreak === 0) currentStreak = runStreak
      } else {
        // Score too low - breaks streak
        if (currentStreak === 0) currentStreak = 0
        runStreak = 0
      }
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1)
    } else if (dayDiff === 1) {
      // One day gap is allowed only if today is the current date
      // and the result is from yesterday - keep looking
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1)
      // Re-process this row against the new expected date
      // by rewinding the loop index - handled by re-checking dayDiff next iter
      continue
    } else {
      // Gap of more than 1 day - streak broken
      break
    }

    longestStreak = Math.max(longestStreak, runStreak)
  }

  longestStreak = Math.max(longestStreak, runStreak)

  // Also compare against existing longest_streak in DB
  const existing = await client.query<{ longest_streak: number }>(
    `SELECT longest_streak FROM category_streaks WHERE player_id = $1 AND category = $2`,
    [playerId, category]
  )
  const dbLongest = existing.rows[0]?.longest_streak ?? 0
  longestStreak = Math.max(longestStreak, dbLongest)

  return { currentStreak, longestStreak }
}
