'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import { getUtcDateString } from '@/lib/puzzles/hmac'
import type { PuzzleCategory } from '@/types/puzzle'

const Schema = z.object({
  playerId: z.string().uuid(),
  category: z.enum(['recall', 'surge', 'cipher', 'strike', 'depths']),
  puzzleDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
})

export interface LeaderboardEntry {
  rank: number
  displayName: string
  normalizedScore: number
  elapsedMs: number
  isCurrentPlayer: boolean
}

export interface LeaderboardResult {
  success: boolean
  error?: string
  entries?: LeaderboardEntry[]
  playerEntry?: LeaderboardEntry | null
  playerRank?: number | null
  totalPlayers?: number
  puzzleDate?: string
  category?: PuzzleCategory
  familyDisplayName?: string
  familyIndex?: number
}

export async function getLeaderboard(
  playerId: string,
  category: PuzzleCategory,
  puzzleDate?: string
): Promise<LeaderboardResult> {
  const parsed = Schema.safeParse({ playerId, category, puzzleDate })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const date = puzzleDate ?? getUtcDateString()
  const client = await pool.connect()

  try {
    // Validate player exists
    const playerRow = await client.query(
      `SELECT id FROM players WHERE id = $1`,
      [playerId]
    )
    if (playerRow.rows.length === 0) {
      return { success: false, error: 'Player not found' }
    }

    // Total player count for this puzzle
    const countRow = await client.query<{ total: string }>(
      `SELECT COUNT(*) AS total
        FROM daily_results
        WHERE puzzle_date = $1 AND category = $2`,
      [date, category]
    )
    const totalPlayers = parseInt(countRow.rows[0]?.total ?? '0', 10)

    // Top 50 entries ordered by score desc, elapsed asc
    const topRows = await client.query<{
      player_id: string
      display_name: string | null
      recovery_code: string
      normalized_score: number
      elapsed_ms: number
    }>(
      `SELECT dr.player_id, p.display_name, p.recovery_code,
              dr.normalized_score, dr.elapsed_ms
        FROM daily_results dr
        JOIN players p ON p.id = dr.player_id
        WHERE dr.puzzle_date = $1 AND dr.category = $2
        ORDER BY dr.normalized_score DESC, dr.elapsed_ms ASC
        LIMIT 50`,
      [date, category]
    )

    const entries: LeaderboardEntry[] = topRows.rows.map((row, i) => ({
      rank: i + 1,
      displayName:
        row.display_name ??
        row.recovery_code
          .split('-')
          .map(
            (p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
          )
          .join(''),
      normalizedScore: row.normalized_score,
      elapsedMs: row.elapsed_ms,
      isCurrentPlayer: row.player_id === playerId
    }))

    // Check if the current player is already in the top 50
    const playerInTop = entries.find((e) => e.isCurrentPlayer) ?? null

    // If not in top 50, fetch their rank separately
    let playerEntry: LeaderboardEntry | null = playerInTop
    let playerRank: number | null = playerInTop?.rank ?? null

    if (!playerInTop) {
      const playerResultRow = await client.query<{
        normalized_score: number
        elapsed_ms: number
        display_name: string | null
        recovery_code: string
      }>(
        `SELECT dr.normalized_score, dr.elapsed_ms,
                p.display_name, p.recovery_code
          FROM daily_results dr
          JOIN players p ON p.id = dr.player_id
          WHERE dr.puzzle_date = $1 AND dr.category = $2 AND dr.player_id = $3`,
        [date, category, playerId]
      )

      if (playerResultRow.rows.length > 0) {
        const pr = playerResultRow.rows[0]

        // Compute rank: count players scoring higher, or same score with lower elapsed
        const rankRow = await client.query<{ rank: string }>(
          `SELECT COUNT(*) + 1 AS rank
            FROM daily_results
            WHERE puzzle_date = $1 AND category = $2
              AND (normalized_score > $3
                  OR (normalized_score = $3 AND elapsed_ms < $4))`,
          [date, category, pr.normalized_score, pr.elapsed_ms]
        )
        playerRank = parseInt(rankRow.rows[0]?.rank ?? '1', 10)

        playerEntry = {
          rank: playerRank,
          displayName:
            pr.display_name ??
            pr.recovery_code
              .split('-')
              .map(
                (p: string) =>
                  p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
              )
              .join(''),
          normalizedScore: pr.normalized_score,
          elapsedMs: pr.elapsed_ms,
          isCurrentPlayer: true
        }
      }
    }

    // Fetch puzzle family info for display
    const puzzleRow = await client.query<{
      puzzle_family_id: string
      family_index: number
    }>(
      `SELECT puzzle_family_id, family_index
        FROM daily_puzzles
        WHERE puzzle_date = $1 AND category = $2`,
      [date, category]
    )

    const puzzleInfo = puzzleRow.rows[0]

    return {
      success: true,
      entries,
      playerEntry,
      playerRank,
      totalPlayers,
      puzzleDate: date,
      category,
      familyIndex: puzzleInfo?.family_index
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
