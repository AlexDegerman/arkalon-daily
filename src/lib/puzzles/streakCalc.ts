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

  // Build a map of date -> score for fast lookup
  const dateScoreMap = new Map<string, number>()
  for (const row of rows.rows) {
    dateScoreMap.set(row.puzzle_date, row.normalized_score)
  }

  // Walk backward from today, one day at a time
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let currentStreak = 0
  const checkDate = new Date(today)

  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10)
    const score = dateScoreMap.get(dateStr)

    if (score === undefined || score < STREAK_MIN_SCORE) {
      // No qualifying result on this day - streak is broken
      break
    }

    currentStreak++
    checkDate.setUTCDate(checkDate.getUTCDate() - 1)
  }

  // Preserve longest streak from DB
  const existing = await client.query<{ longest_streak: number }>(
    `SELECT longest_streak FROM category_streaks WHERE player_id = $1 AND category = $2`,
    [playerId, category]
  )
  const dbLongest = existing.rows[0]?.longest_streak ?? 0
  const longestStreak = Math.max(currentStreak, dbLongest)

  return { currentStreak, longestStreak }
}