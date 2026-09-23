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

import { cookies } from 'next/headers'

export async function getPlayerProfile(
  playerIdOrShortId?: string | null
): Promise<GetPlayerProfileResult> {
  try {
    let activePlayerId: string

    if (!playerIdOrShortId) {
      const cookieStore = await cookies()
      const cookieCoreId = cookieStore.get('arkalon_core_id')?.value
      if (cookieCoreId && z.string().uuid().safeParse(cookieCoreId).success) {
        activePlayerId = cookieCoreId
      } else {
        const dailyPlayer = await getOrCreateDailyPlayer()
        activePlayerId = dailyPlayer.coreId
      }
    } else {
      const resolved = await pool.query<{ id: string }>(
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
    let playerRow = await pool.query<{
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

      playerRow = await pool.query(
        `SELECT id, short_id, display_name, created_at::text,
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

    const todayUtc = getUtcDateString()

    // 1. Fetch streaks, aggregations, and today's results concurrently across pool connections
    const [streaksResult, aggsResult, todayResult] = await Promise.all([
      pool.query<{
        category: string
        current_streak: number
        longest_streak: number
      }>(
        `SELECT category, current_streak, longest_streak
          FROM category_streaks
          WHERE player_id = $1`,
        [activePlayerId]
      ),
      pool.query<{
        category: string
        count: string
        best_score: number | null
        avg_score: string | null
      }>(
        `SELECT category,
                COUNT(*)::text AS count,
                MAX(normalized_score) AS best_score,
                AVG(normalized_score)::numeric(5,1) AS avg_score
          FROM daily_results
          WHERE player_id = $1
          GROUP BY category`,
        [activePlayerId]
      ),
      pool.query<{
        category: string
        normalized_score: number
        status: string
      }>(
        `SELECT category, normalized_score, status
          FROM daily_results
          WHERE player_id = $1 AND puzzle_date = $2`,
        [activePlayerId, todayUtc]
      ),
      pool.query(`UPDATE players SET last_seen_at = now() WHERE id = $1`, [
        activePlayerId
      ])
    ])

    const streakMap = Object.fromEntries(
      streaksResult.rows.map((r) => [r.category, r])
    )
    const aggMap = Object.fromEntries(
      aggsResult.rows.map((r) => [r.category, r])
    )
    const todayMap = Object.fromEntries(
      todayResult.rows.map((r) => [r.category, r])
    )

    // Global percentile: what fraction of players this player outscores (lower = better)
    const categoriesWithBests = CATEGORY_ORDER.filter(
      (cat) => aggMap[cat]?.best_score != null
    )

    // Single-pass percentile scan across pool connections
    const percentileResults = await Promise.all(
      categoriesWithBests.map(async (category) => {
        const best = aggMap[category].best_score!
        const percentileRow = await pool.query<{
          total_players: string
          players_above: string
        }>(
          `SELECT 
              COUNT(*) AS total_players,
              COUNT(*) FILTER (WHERE best > $2) AS players_above
            FROM (
              SELECT MAX(normalized_score) AS best
              FROM daily_results
              WHERE category = $1
              GROUP BY player_id
            ) pb`,
          [category, best]
        )
        // A percentile over a tiny population is noise, not a rank
        const total = parseInt(percentileRow.rows[0]?.total_players ?? '0', 10)
        let globalPercentile: number | null = null
        if (total >= 25) {
          const above = parseInt(
            percentileRow.rows[0]?.players_above ?? '0',
            10
          )
          const pct = parseFloat(((above * 100.0) / total).toFixed(1))
          // Floor at 1.0 so the category leader reads "Top 1.0%", never "Top 0.0%"
          globalPercentile = isNaN(pct) ? null : Math.max(1, pct)
        }
        return [category, globalPercentile] as const
      })
    )

    const percentileMap = Object.fromEntries(percentileResults)

    const stats: CategoryStats[] = CATEGORY_ORDER.map((category) => {
      const agg = aggMap[category]
      const streak = streakMap[category] ?? {
        current_streak: 0,
        longest_streak: 0
      }
      const daysPlayed = parseInt(agg?.count ?? '0', 10)
      // Aggregate results - only include in averages if >= 3 submissions
      const hasEnoughData = daysPlayed >= 3
      const today = todayMap[category]
      return {
        category: category as PuzzleCategory,
        bestScore: agg?.best_score ?? 0,
        averageScore: hasEnoughData
          ? parseFloat(agg?.avg_score?.toString() ?? '0')
          : 0,
        daysPlayed,
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
        globalPercentile: percentileMap[category] ?? null,
        todayResult: today
          ? {
              score: today.normalized_score,
              status: today.status as 'solved' | 'failed'
            }
          : null
      }
    })

    return { success: true, profile, stats }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}