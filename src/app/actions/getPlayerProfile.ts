'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import { getUtcDateString } from '@/lib/puzzles/hmac'
import type { PlayerProfile, CategoryStats } from '@/types/puzzle'
import type { PuzzleCategory } from '@/types/puzzle'
import { CATEGORY_ORDER } from '@/constants/categories'
import { getOrCreateDailyPlayer } from './getOrCreateDailyPlayer'

export interface GetPlayerProfileResult {
  success: boolean
  error?: string
  profile?: PlayerProfile
  stats?: CategoryStats[]
}

export async function getPlayerProfile(
  playerIdOrShortId?: string | null
): Promise<GetPlayerProfileResult> {
  const client = await pool.connect()
  try {
    let activePlayerId: string

    if (!playerIdOrShortId) {
      const dailyPlayer = await getOrCreateDailyPlayer()
      activePlayerId = dailyPlayer.coreId
    } else {
      const resolved = await client.query<{ id: string }>(
        'SELECT id FROM players WHERE short_id = $1 OR id::text = $1 LIMIT 1',
        [playerIdOrShortId]
      )
      if (resolved.rows.length > 0) {
        activePlayerId = resolved.rows[0].id
      } else if (z.string().uuid().safeParse(playerIdOrShortId).success) {
        activePlayerId = playerIdOrShortId
      } else {
        return { success: false, error: 'Player not found' }
      }
    }

    // Fetch player row
    let playerRow = await client.query<{
      id: string
      short_id: string | null
      display_name: string | null
      created_at: string
      trials_completed: string[]
      recovery_tutorial_shown: boolean
    }>(
      `SELECT id, short_id, display_name, created_at::text,
              trials_completed, recovery_tutorial_shown
        FROM players
        WHERE id = $1`,
      [activePlayerId]
    )

    // If player does not exist in local database yet, auto-provision
    if (playerRow.rows.length === 0) {
      const dailyPlayer = await getOrCreateDailyPlayer()
      activePlayerId = dailyPlayer.coreId

      playerRow = await client.query(
        `SELECT id, display_name, created_at::text,
                trials_completed, recovery_tutorial_shown
          FROM players
          WHERE id = $1`,
        [activePlayerId]
      )
    }

    if (playerRow.rows.length === 0) {
      return { success: false, error: 'Player not found' }
    }

    const p = playerRow.rows[0]
    const profile: PlayerProfile = {
      id: p.id,
      shortId: p.short_id ?? p.id.slice(0, 8),
      displayName: p.display_name,
      createdAt: p.created_at,
      trialsCompleted: p.trials_completed ?? [],
      recoveryTutorialShown: p.recovery_tutorial_shown ?? false
    }

    // Update last_seen_at
    await client.query(
      `UPDATE players SET last_seen_at = now() WHERE id = $1`,
      [activePlayerId]
    )

    // Fetch per-category stats
    const stats: CategoryStats[] = []

    for (const category of CATEGORY_ORDER) {
      let streakRow = await client.query<{
        current_streak: number
        longest_streak: number
      }>(
        `SELECT current_streak, longest_streak
          FROM category_streaks
          WHERE player_id = $1 AND category = $2`,
        [activePlayerId, category]
      )

      if (streakRow.rows.length === 0) {
        await client.query(
          `INSERT INTO category_streaks (player_id, category, current_streak, longest_streak)
            VALUES ($1, $2, 0, 0)
            ON CONFLICT DO NOTHING`,
          [activePlayerId, category]
        )
        streakRow = await client.query(
          `SELECT current_streak, longest_streak
            FROM category_streaks
            WHERE player_id = $1 AND category = $2`,
          [activePlayerId, category]
        )
      }

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
        [activePlayerId, category]
      )

      const agg = aggRow.rows[0]
      const daysPlayed = parseInt(agg.count, 10)
      const hasEnoughData = daysPlayed >= 3

      // Global percentile: what fraction of players this player outscores (lower = better)
      let globalPercentile: number | null = null
      if (agg.best_score !== null) {
        const percentileRow = await client.query<{
          pct: string
          total_players: string
        }>(
          `WITH player_bests AS (
          SELECT player_id, MAX(normalized_score) AS best
          FROM daily_results
          WHERE category = $1
          GROUP BY player_id
        )
        SELECT ROUND(
          100.0 * (SELECT COUNT(*) FROM player_bests WHERE best > $2)
            / GREATEST((SELECT COUNT(*) FROM player_bests), 1)
        , 1) AS pct,
        (SELECT COUNT(*) FROM player_bests) AS total_players`,
          [category, agg.best_score]
        )
        // A percentile over a tiny population is noise, not a rank
        const totalPlayers = parseInt(
          percentileRow.rows[0]?.total_players ?? '0',
          10
        )
        if (totalPlayers >= 25) {
          const pct = parseFloat(percentileRow.rows[0]?.pct ?? '0')
          // Floor at 1.0 so the category leader reads "Top 1.0%", never "Top 0.0%"
          globalPercentile = isNaN(pct) ? null : Math.max(1, pct)
        }
      }

      const todayUtc = getUtcDateString()
      const todayRow = await client.query<{
        normalized_score: number
        status: string
      }>(
        `SELECT normalized_score, status
          FROM daily_results
          WHERE player_id = $1 AND category = $2 AND puzzle_date = $3`,
        [activePlayerId, category, todayUtc]
      )
      const todayResult =
        todayRow.rows.length > 0
          ? {
              score: todayRow.rows[0].normalized_score,
              status: todayRow.rows[0].status as 'solved' | 'failed'
            }
          : null

      stats.push({
        category: category as PuzzleCategory,
        bestScore: agg.best_score ?? 0,
        averageScore: hasEnoughData
          ? parseFloat(agg.avg_score?.toString() ?? '0')
          : 0,
        daysPlayed,
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
        globalPercentile,
        todayResult
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
