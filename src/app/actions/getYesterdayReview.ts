'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import type { PuzzleCategory } from '@/types/puzzle'

const Schema = z.object({
  playerId: z.string().uuid(),
  category: z.enum(['recall', 'surge', 'cipher', 'strike', 'depths'])
})

export interface ScoreBucket {
  label: string // e.g. "90-100"
  minScore: number
  maxScore: number
  count: number
  pct: number // 0-100
}

export interface YesterdayReviewResult {
  success: boolean
  error?: string
  puzzleDate?: string
  category?: PuzzleCategory
  familyIndex?: number
  totalPlayers?: number
  averageScore?: number
  medianScore?: number
  topOneThreshold?: number // minimum score to be in top 1%
  scoreBuckets?: ScoreBucket[]
  playerScore?: number | null
  playerRank?: number | null
  playerPercentile?: number | null
}

// Returns yesterday's UTC date string in YYYY-MM-DD format.
function getYesterdayUtc(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

const SCORE_BUCKETS = [
  { label: '90-100', minScore: 90, maxScore: 100 },
  { label: '70-89', minScore: 70, maxScore: 89 },
  { label: '50-69', minScore: 50, maxScore: 69 },
  { label: '30-49', minScore: 30, maxScore: 49 },
  { label: '0-29', minScore: 0, maxScore: 29 }
]

export async function getYesterdayReview(
  playerId: string,
  category: PuzzleCategory
): Promise<YesterdayReviewResult> {
  const parsed = Schema.safeParse({ playerId, category })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const yesterday = getYesterdayUtc()
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

    // Check the player completed this category yesterday
    const playerResult = await client.query<{
      normalized_score: number
    }>(
      `SELECT normalized_score
        FROM daily_results
        WHERE player_id = $1 AND puzzle_date = $2 AND category = $3`,
      [playerId, yesterday, category]
    )

    const playerScore =
      playerResult.rows.length > 0
        ? playerResult.rows[0].normalized_score
        : null

    // Community aggregates
    const aggRow = await client.query<{
      total: string
      avg_score: string | null
      median_score: number | null
      top1_threshold: number | null
    }>(
      `SELECT
          COUNT(*) AS total,
          AVG(normalized_score)::numeric(5,1) AS avg_score,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY normalized_score) AS median_score,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY normalized_score) AS top1_threshold
        FROM daily_results
        WHERE puzzle_date = $1 AND category = $2`,
      [yesterday, category]
    )

    const agg = aggRow.rows[0]
    const totalPlayers = parseInt(agg?.total ?? '0', 10)

    if (totalPlayers === 0) {
      return {
        success: false,
        error: 'No results found for yesterday.'
      }
    }

    // Score distribution buckets
    const bucketRows = await client.query<{
      min_score: number
      count: string
    }>(
      `SELECT
          CASE
            WHEN normalized_score >= 90 THEN 90
            WHEN normalized_score >= 70 THEN 70
            WHEN normalized_score >= 50 THEN 50
            WHEN normalized_score >= 30 THEN 30
            ELSE 0
          END AS min_score,
          COUNT(*) AS count
        FROM daily_results
        WHERE puzzle_date = $1 AND category = $2
        GROUP BY 1
        ORDER BY 1 DESC`,
      [yesterday, category]
    )

    const bucketCountMap = Object.fromEntries(
      bucketRows.rows.map((r) => [r.min_score, parseInt(r.count, 10)])
    )

    const scoreBuckets: ScoreBucket[] = SCORE_BUCKETS.map((b) => {
      const count = bucketCountMap[b.minScore] ?? 0
      return {
        ...b,
        count,
        pct: totalPlayers > 0 ? Math.round((count / totalPlayers) * 100) : 0
      }
    })

    // Player rank if they played yesterday
    let playerRank: number | null = null
    let playerPercentile: number | null = null

    if (playerScore !== null) {
      const rankRow = await client.query<{ rank: string }>(
        `SELECT COUNT(*) + 1 AS rank
          FROM daily_results
          WHERE puzzle_date = $1 AND category = $2
            AND normalized_score > $3`,
        [yesterday, category, playerScore]
      )
      playerRank = parseInt(rankRow.rows[0]?.rank ?? '1', 10)
      playerPercentile =
        totalPlayers > 0
          ? parseFloat(((playerRank / totalPlayers) * 100).toFixed(1))
          : null
    }

    // Puzzle family info
    const puzzleRow = await client.query<{
      family_index: number
    }>(
      `SELECT family_index
        FROM daily_puzzles
        WHERE puzzle_date = $1 AND category = $2`,
      [yesterday, category]
    )

    return {
      success: true,
      puzzleDate: yesterday,
      category,
      familyIndex: puzzleRow.rows[0]?.family_index,
      totalPlayers,
      averageScore: parseFloat(agg?.avg_score ?? '0'),
      medianScore: Math.round(agg?.median_score ?? 0),
      topOneThreshold: Math.round(agg?.top1_threshold ?? 100),
      scoreBuckets,
      playerScore,
      playerRank,
      playerPercentile
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
