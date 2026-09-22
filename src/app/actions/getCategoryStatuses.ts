'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import { getUtcDateString } from '@/lib/puzzles/hmac'
import { CATEGORY_ORDER } from '@/constants/categories'
import type { CategoryStatus, PuzzleCategory } from '@/types/puzzle'

const Schema = z.object({ playerId: z.string().uuid() })

export async function getCategoryStatuses(
  playerId: string
): Promise<{ success: boolean; statuses?: CategoryStatus[]; error?: string }> {
  const parsed = Schema.safeParse({ playerId })
  if (!parsed.success) {
    return { success: false, error: 'Invalid player ID' }
  }

  const todayUtc = getUtcDateString()
  const yesterdayUtc = new Date(Date.now() - 86400000)
    .toISOString()
    .slice(0, 10)
  const client = await pool.connect()

  try {
    const playerRow = await client.query<{
      trials_completed: string[]
    }>('SELECT trials_completed FROM players WHERE id = $1', [playerId])
    if (playerRow.rows.length === 0) {
      return { success: false, error: 'Player not found' }
    }
    const trialsCompleted = playerRow.rows[0].trials_completed ?? []

    // Today's results for this player
    const resultsRow = await client.query<{
      category: string
      normalized_score: number
      status: string
    }>(
      `SELECT category, normalized_score, status
        FROM daily_results
        WHERE player_id = $1 AND puzzle_date = $2`,
      [playerId, todayUtc]
    )
    const resultMap = Object.fromEntries(
      resultsRow.rows.map((r) => [r.category, r])
    )

    // Yesterday's results for this player
    const yesterdayRow = await client.query<{
      category: string
      normalized_score: number
    }>(
      `SELECT category, normalized_score
        FROM daily_results
        WHERE player_id = $1 AND puzzle_date = $2`,
      [playerId, yesterdayUtc]
    )
    const yesterdayMap = Object.fromEntries(
      yesterdayRow.rows.map((r) => [r.category, r.normalized_score])
    )

    // Streaks
    const streakRows = await client.query<{
      category: string
      current_streak: number
    }>(
      `SELECT category, current_streak
        FROM category_streaks
        WHERE player_id = $1`,
      [playerId]
    )
    const streakMap = Object.fromEntries(
      streakRows.rows.map((r) => [r.category, r.current_streak])
    )

    const statuses: CategoryStatus[] = CATEGORY_ORDER.map((slug) => {
      const result = resultMap[slug]
      const trialCompleted = trialsCompleted.includes(slug)
      const streakDays = (streakMap[slug] as number) ?? 0

          const yesterdayScore = yesterdayMap[slug] as number | undefined

    if (result) {
      return {
        category: slug as PuzzleCategory,
        status: result.status === 'solved' ? 'solved' : 'failed',
        score: result.normalized_score,
        streakDays,
        trialCompleted,
        yesterdayScore
      }
    }
    return {
      category: slug as PuzzleCategory,
      status: trialCompleted ? 'available' : 'trial',
      streakDays,
      trialCompleted,
      yesterdayScore
    }
    })

    return { success: true, statuses }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
