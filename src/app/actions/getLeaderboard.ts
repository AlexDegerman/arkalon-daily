'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import { getUtcDateString } from '@/lib/puzzles/hmac'
import {
  LEADERBOARD_THRESHOLDS,
  getIsoWeekStartUtc,
  addDaysUtc,
  type LeaderboardPeriod,
  type LeaderboardScope
} from '@/lib/leaderboardPeriods'
import type { PoolClient } from 'pg'
import type { PuzzleCategory } from '@/types/puzzle'

const Schema = z.object({
  playerId: z.string().optional().nullable(),
  category: z.enum(['recall', 'surge', 'cipher', 'strike', 'depths', 'total']),
  period: z.enum(['daily', 'weekly', 'alltime']),
  puzzleDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
})

export interface LeaderboardEntry {
  rank: number
  playerId: string
  shortId: string
  displayName: string
  normalizedScore: number
  elapsedMs: number
  avgScore: number | null
  clears: number | null
  bestScore: number | null
  totalPoints: number | null
  streakDays: number | null
  clearsByCategory: Record<string, number> | null
  isCurrentPlayer: boolean
}

export interface PlayerProvisional {
  plays: number
  clears: number
  avgScore: number
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
  period?: LeaderboardPeriod
  scope?: LeaderboardScope
  threshold?: number
  playerQualified?: boolean
  playerProvisional?: PlayerProvisional | null
  weekStart?: string
  weekEnd?: string
}

interface AggregateRow {
  player_id: string
  short_id: string | null
  display_name: string | null
  plays: string
  clears: string
  avg_score: string
  best_score: number
  total_points: string
  clears_recall?: string
  clears_surge?: string
  clears_cipher?: string
  clears_strike?: string
  clears_depths?: string
}

// Player-agnostic board rows; safe to share across requests for 45s.
const BOARD_CACHE_TTL_MS = 45_000
interface CachedBoard {
  entries: LeaderboardEntry[]
  qualifiedCount: number
  expires: number
}
const boardCache = new Map<string, CachedBoard>()

async function fetchStreakMap(
  client: PoolClient,
  playerIds: string[],
  scope: LeaderboardScope
): Promise<Record<string, number>> {
  if (playerIds.length === 0) return {}
  const sql =
    scope === 'total'
      ? `SELECT player_id, SUM(current_streak)::int AS streak
          FROM category_streaks
          WHERE player_id = ANY($1::uuid[])
          GROUP BY player_id`
      : `SELECT player_id, current_streak AS streak
          FROM category_streaks
          WHERE player_id = ANY($1::uuid[]) AND category = $2`
  const args = scope === 'total' ? [playerIds] : [playerIds, scope]
  const rows = await client.query<{ player_id: string; streak: number }>(
    sql,
    args
  )
  return Object.fromEntries(rows.rows.map((r) => [r.player_id, r.streak]))
}

function mapAggregateRow(
  row: AggregateRow,
  rank: number,
  streakMap: Record<string, number>,
  scope: LeaderboardScope
): LeaderboardEntry {
  return {
    rank,
    playerId: row.player_id,
    shortId: row.short_id ?? row.player_id.slice(0, 8),
    displayName: row.display_name ?? 'Player',
    normalizedScore: 0,
    elapsedMs: 0,
    avgScore: parseFloat(row.avg_score),
    clears: parseInt(row.clears, 10),
    bestScore: row.best_score,
    totalPoints: parseInt(row.total_points, 10),
    streakDays: streakMap[row.player_id] ?? 0,
    clearsByCategory:
      scope === 'total'
        ? {
            recall: parseInt(row.clears_recall ?? '0', 10),
            surge: parseInt(row.clears_surge ?? '0', 10),
            cipher: parseInt(row.clears_cipher ?? '0', 10),
            strike: parseInt(row.clears_strike ?? '0', 10),
            depths: parseInt(row.clears_depths ?? '0', 10)
          }
        : null,
    isCurrentPlayer: false
  }
}

export async function getLeaderboard(
  playerId?: string | null,
  category: LeaderboardScope = 'recall',
  period: LeaderboardPeriod = 'daily',
  puzzleDate?: string
): Promise<LeaderboardResult> {
  const parsed = Schema.safeParse({ playerId, category, period, puzzleDate })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }
  const validPlayerId =
    parsed.data.playerId &&
    z.string().uuid().safeParse(parsed.data.playerId).success
      ? parsed.data.playerId
      : null

  if (period === 'daily' && category !== 'total') {
    return getDailyCategoryLeaderboard(validPlayerId, category, puzzleDate)
  }
  return getAggregateLeaderboard(validPlayerId, category, period, puzzleDate)
}

interface CachedDailyBoard {
  entries: LeaderboardEntry[]
  totalPlayers: number
  familyIndex?: number
  expires: number
}
const dailyBoardCache = new Map<string, CachedDailyBoard>()

async function getDailyCategoryLeaderboard(
  validPlayerId: string | null,
  category: PuzzleCategory,
  puzzleDate?: string
): Promise<LeaderboardResult> {
  const date = puzzleDate ?? getUtcDateString()
  const cacheKey = `daily:${category}:${date}`
  const cached = dailyBoardCache.get(cacheKey)

  try {
    let boardEntries: LeaderboardEntry[]
    let totalPlayers: number
    let familyIndex: number | undefined

    if (cached && cached.expires > Date.now()) {
      boardEntries = cached.entries
      totalPlayers = cached.totalPlayers
      familyIndex = cached.familyIndex
    } else {
      // Execute count, top-50, and puzzle info in parallel
      const [countRow, topRows, puzzleRow] = await Promise.all([
        pool.query<{ total: string }>(
          `SELECT COUNT(*) AS total
           FROM daily_results
           WHERE puzzle_date = $1 AND category = $2`,
          [date, category]
        ),
        pool.query<{
          player_id: string
          short_id: string | null
          display_name: string | null
          normalized_score: number
          elapsed_ms: number
        }>(
          `SELECT dr.player_id, p.short_id, p.display_name,
                  dr.normalized_score, dr.elapsed_ms
           FROM daily_results dr
           JOIN players p ON p.id = dr.player_id
           WHERE dr.puzzle_date = $1 AND dr.category = $2
           ORDER BY dr.normalized_score DESC, dr.elapsed_ms ASC
           LIMIT 50`,
          [date, category]
        ),
        pool.query<{
          puzzle_family_id: string
          family_index: number
        }>(
          `SELECT puzzle_family_id, family_index
           FROM daily_puzzles
           WHERE puzzle_date = $1 AND category = $2`,
          [date, category]
        )
      ])

      totalPlayers = parseInt(countRow.rows[0]?.total ?? '0', 10)
      familyIndex = puzzleRow.rows[0]?.family_index

      boardEntries = topRows.rows.map((row, i) => ({
        rank: i + 1,
        playerId: row.player_id,
        shortId: row.short_id ?? row.player_id.slice(0, 8),
        displayName: row.display_name ?? 'Player',
        normalizedScore: row.normalized_score,
        elapsedMs: row.elapsed_ms,
        avgScore: null,
        clears: null,
        bestScore: null,
        totalPoints: null,
        streakDays: null,
        clearsByCategory: null,
        isCurrentPlayer: false
      }))

      dailyBoardCache.set(cacheKey, {
        entries: boardEntries,
        totalPlayers,
        familyIndex,
        expires: Date.now() + BOARD_CACHE_TTL_MS
      })
    }

    const entries = boardEntries.map((e) =>
      validPlayerId && e.playerId === validPlayerId
        ? { ...e, isCurrentPlayer: true }
        : e
    )

    const playerInTop = entries.find((e) => e.isCurrentPlayer) ?? null
    let playerEntry: LeaderboardEntry | null = playerInTop
    let playerRank: number | null = playerInTop?.rank ?? null

    if (validPlayerId && !playerInTop) {
      const playerResultRow = await pool.query<{
        normalized_score: number
        elapsed_ms: number
        display_name: string | null
        short_id: string | null
      }>(
        `SELECT dr.normalized_score, dr.elapsed_ms,
                p.display_name, p.short_id
         FROM daily_results dr
         JOIN players p ON p.id = dr.player_id
         WHERE dr.puzzle_date = $1 AND dr.category = $2 AND dr.player_id = $3`,
        [date, category, validPlayerId]
      )
      if (playerResultRow.rows.length > 0) {
        const pr = playerResultRow.rows[0]
        const rankRow = await pool.query<{ rank: string }>(
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
          playerId: validPlayerId,
          shortId: pr.short_id ?? validPlayerId.slice(0, 8),
          displayName: pr.display_name ?? 'Player',
          normalizedScore: pr.normalized_score,
          elapsedMs: pr.elapsed_ms,
          avgScore: null,
          clears: null,
          bestScore: null,
          totalPoints: null,
          streakDays: null,
          clearsByCategory: null,
          isCurrentPlayer: true
        }
      }
    }

    return {
      success: true,
      entries,
      playerEntry,
      playerRank,
      totalPlayers,
      puzzleDate: date,
      category,
      familyIndex,
      period: 'daily',
      scope: category
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

async function getAggregateLeaderboard(
  validPlayerId: string | null,
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
  puzzleDate?: string
): Promise<LeaderboardResult> {
  const today = getUtcDateString()
  let dateStart: string | null = null
  let dateEnd: string | null = null
  if (period === 'daily') {
    dateStart = puzzleDate ?? today
    dateEnd = dateStart
  } else if (period === 'weekly') {
    dateStart = getIsoWeekStartUtc()
    dateEnd = addDaysUtc(dateStart, 6)
  }
  const threshold =
    LEADERBOARD_THRESHOLDS[period][scope === 'total' ? 'total' : 'category']

  const client = await pool.connect()
  try {
    const whereParts: string[] = []
    const params: unknown[] = []
    if (scope !== 'total') {
      params.push(scope)
      whereParts.push(`category = $${params.length}`)
    }
    if (dateStart && dateEnd) {
      params.push(dateStart, dateEnd)
      whereParts.push(
        `puzzle_date >= $${params.length - 1} AND puzzle_date <= $${params.length}`
      )
    }
    const whereSql =
      whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : ''
    const stripCols =
      scope === 'total'
        ? `,
              COUNT(*) FILTER (WHERE status = 'solved' AND category = 'recall') AS clears_recall,
              COUNT(*) FILTER (WHERE status = 'solved' AND category = 'surge') AS clears_surge,
              COUNT(*) FILTER (WHERE status = 'solved' AND category = 'cipher') AS clears_cipher,
              COUNT(*) FILTER (WHERE status = 'solved' AND category = 'strike') AS clears_strike,
              COUNT(*) FILTER (WHERE status = 'solved' AND category = 'depths') AS clears_depths`
        : ''
    params.push(threshold)
    const minParam = params.length
    const aggCte = `WITH agg AS (
          SELECT player_id,
              COUNT(*) AS plays,
              COUNT(*) FILTER (WHERE status = 'solved') AS clears,
              AVG(normalized_score)::numeric(5,1) AS avg_score,
              MAX(normalized_score) AS best_score,
              SUM(normalized_score) AS total_points${stripCols}
        FROM daily_results
        ${whereSql}
        GROUP BY player_id
        HAVING COUNT(*) >= $${minParam}
          AND COUNT(*) FILTER (WHERE status = 'solved') >= 1
        )`

    const cacheKey = `${period}:${scope}:${dateStart ?? 'all'}`
    const cached = boardCache.get(cacheKey)
    let boardEntries: LeaderboardEntry[]
    let qualifiedCount: number
    if (cached && cached.expires > Date.now()) {
      boardEntries = cached.entries
      qualifiedCount = cached.qualifiedCount
    } else {
      const boardRows = await client.query<AggregateRow>(
        `${aggCte}
          SELECT a.*, p.short_id, p.display_name
          FROM agg a
          JOIN players p ON p.id = a.player_id
          ORDER BY a.avg_score DESC, a.clears DESC, a.best_score DESC
          LIMIT 50`,
        params
      )
      const countRow = await client.query<{ total: string }>(
        `${aggCte} SELECT COUNT(*) AS total FROM agg`,
        params
      )
      qualifiedCount = parseInt(countRow.rows[0]?.total ?? '0', 10)
      const streakMap = await fetchStreakMap(
        client,
        boardRows.rows.map((r) => r.player_id),
        scope
      )
      boardEntries = boardRows.rows.map((row, i) =>
        mapAggregateRow(row, i + 1, streakMap, scope)
      )
      boardCache.set(cacheKey, {
        entries: boardEntries,
        qualifiedCount,
        expires: Date.now() + BOARD_CACHE_TTL_MS
      })
    }

    let playerEntry: LeaderboardEntry | null = null
    let playerRank: number | null = null
    let playerQualified = false
    let playerProvisional: PlayerProvisional | null = null

    if (validPlayerId) {
      const pParams: unknown[] = [validPlayerId]
      const pWhere: string[] = ['player_id = $1']
      if (scope !== 'total') {
        pParams.push(scope)
        pWhere.push(`category = $${pParams.length}`)
      }
      if (dateStart && dateEnd) {
        pParams.push(dateStart, dateEnd)
        pWhere.push(
          `puzzle_date >= $${pParams.length - 1} AND puzzle_date <= $${pParams.length}`
        )
      }
      const pWhereSql = pWhere.join(' AND ')
      const playerAgg = await client.query<{
        plays: string
        clears: string
        avg_score: string | null
        best_score: number | null
        total_points: string | null
      }>(
        `SELECT COUNT(*) AS plays,
                COUNT(*) FILTER (WHERE status = 'solved') AS clears,
                AVG(normalized_score)::numeric(5,1) AS avg_score,
                MAX(normalized_score) AS best_score,
                SUM(normalized_score) AS total_points
          FROM daily_results
          WHERE ${pWhereSql}`,
        pParams
      )
      const pa = playerAgg.rows[0]
      const plays = parseInt(pa?.plays ?? '0', 10)
      const clears = parseInt(pa?.clears ?? '0', 10)
      if (plays > 0) {
        playerProvisional = {
          plays,
          clears,
          avgScore: parseFloat(pa?.avg_score ?? '0')
        }
      }
      playerQualified = plays >= threshold && clears >= 1
      if (playerQualified) {
        const avg = parseFloat(pa?.avg_score ?? '0')
        const best = pa?.best_score ?? 0
        // Rank against the qualified field using the board's sort order
        const rankRow = await client.query<{ rank: string }>(
          `${aggCte}
            SELECT COUNT(*) + 1 AS rank
            FROM agg a
            WHERE a.avg_score > $${minParam + 1}
              OR (a.avg_score = $${minParam + 1} AND a.clears > $${minParam + 2})
              OR (a.avg_score = $${minParam + 1} AND a.clears = $${minParam + 2} AND a.best_score > $${minParam + 3})`,
          [...params, avg, clears, best]
        )
        playerRank = parseInt(rankRow.rows[0]?.rank ?? '1', 10)
        const streakMap = await fetchStreakMap(client, [validPlayerId], scope)
        const nameRow = await client.query<{
          display_name: string | null
          short_id: string | null
        }>('SELECT display_name, short_id FROM players WHERE id = $1', [
          validPlayerId
        ])
        playerEntry = {
          rank: playerRank,
          playerId: validPlayerId,
          shortId: nameRow.rows[0]?.short_id ?? validPlayerId.slice(0, 8),
          displayName: nameRow.rows[0]?.display_name ?? 'Player',
          normalizedScore: 0,
          elapsedMs: 0,
          avgScore: avg,
          clears,
          bestScore: best,
          totalPoints: parseInt(pa?.total_points ?? '0', 10),
          streakDays: streakMap[validPlayerId] ?? 0,
          clearsByCategory: null,
          isCurrentPlayer: true
        }
        if (scope === 'total') {
          const stripRow = await client.query<Record<string, string>>(
            `SELECT COUNT(*) FILTER (WHERE status = 'solved' AND category = 'recall') AS recall,
                    COUNT(*) FILTER (WHERE status = 'solved' AND category = 'surge') AS surge,
                    COUNT(*) FILTER (WHERE status = 'solved' AND category = 'cipher') AS cipher,
                    COUNT(*) FILTER (WHERE status = 'solved' AND category = 'strike') AS strike,
                    COUNT(*) FILTER (WHERE status = 'solved' AND category = 'depths') AS depths
              FROM daily_results
              WHERE ${pWhereSql}`,
            pParams
          )
          const s = stripRow.rows[0]
          if (s) {
            playerEntry.clearsByCategory = {
              recall: parseInt(s.recall ?? '0', 10),
              surge: parseInt(s.surge ?? '0', 10),
              cipher: parseInt(s.cipher ?? '0', 10),
              strike: parseInt(s.strike ?? '0', 10),
              depths: parseInt(s.depths ?? '0', 10)
            }
          }
        }
      }
    }

    const entries = boardEntries.map((e) =>
      validPlayerId && e.playerId === validPlayerId
        ? { ...e, isCurrentPlayer: true }
        : e
    )
    const playerInTop = entries.find((e) => e.isCurrentPlayer) ?? null
    if (playerInTop) {
      playerEntry = playerInTop
      playerRank = playerInTop.rank
      playerQualified = true
    }

    return {
      success: true,
      entries,
      playerEntry,
      playerRank,
      totalPlayers: qualifiedCount,
      puzzleDate: period === 'daily' ? (dateStart ?? today) : undefined,
      category: scope === 'total' ? undefined : (scope as PuzzleCategory),
      period,
      scope,
      threshold,
      playerQualified,
      playerProvisional,
      weekStart: period === 'weekly' ? (dateStart ?? undefined) : undefined,
      weekEnd: period === 'weekly' ? (dateEnd ?? undefined) : undefined
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
