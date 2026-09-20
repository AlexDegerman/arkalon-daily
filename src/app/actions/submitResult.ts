'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import { recomputeStreak } from '@/lib/puzzles/streakCalc'
import {
  scoreRecall,
  scoreSurge,
  scoreStrike,
  scoreCipher,
  scoreDepths,
  isSolved
} from '@/lib/puzzles/scoring'
import type { PuzzleCategory } from '@/types/puzzle'

// Rate limiting store: playerId -> { count, windowStart }
// Eviction: entries older than 120s are pruned on each request
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 5
const RATE_EVICT_MS = 120_000

function checkRateLimit(playerId: string): boolean {
  const now = Date.now()

  // On-access eviction of stale entries
  for (const [id, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_EVICT_MS) {
      rateLimitMap.delete(id)
    }
  }

  const entry = rateLimitMap.get(playerId)
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(playerId, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= RATE_MAX) return false
  entry.count++
  return true
}

const FamilyMetricsSchema = z.union([
  // Recall
  z.object({
    family: z.literal('arkalon_vision'),
    rounds: z.array(
      z.object({
        correctGlyphs: z.number().int().min(0),
        sequenceLength: z.number().int().min(1),
        elapsedMs: z.number().int().min(0),
        errors: z.number().int().min(0)
      })
    ),
    totalElapsedMs: z.number().int().min(0)
  }),
  // Surge
  z.object({
    family: z.literal('surge_frenzy'),
    nodes: z.array(
      z.object({
        reactionMs: z.number().int().min(0),
        isDecoy: z.boolean(),
        consecutiveHitsAtFire: z.number().int().min(0)
      })
    ),
    expectedNodeCount: z.number().int().min(1),
    totalElapsedMs: z.number().int().min(0)
  }),
  // Strike
  z.object({
    family: z.literal('sniper_challenge'),
    shots: z.array(
      z.object({
        deviationPx: z.number().min(0),
        targetWindowPx: z.number().min(1)
      })
    ),
    totalElapsedMs: z.number().int().min(0)
  }),
  // Cipher
  z.object({
    family: z.literal('wild_prediction'),
    correctRounds: z.number().int().min(0),
    totalRounds: z.number().int().min(1),
    totalIncorrectGuesses: z.number().int().min(0),
    totalElapsedMs: z.number().int().min(0)
  }),
  // Depths
  z.object({
    family: z.literal('crystal_mine'),
    depositsFound: z.number().int().min(0),
    totalDeposits: z.number().int().min(1),
    chargesUsed: z.number().int().min(0),
    chargeLimit: z.number().int().min(1),
    totalElapsedMs: z.number().int().min(0)
  })
])

const SubmitSchema = z.object({
  playerId: z.string().uuid(),
  category: z.enum(['recall', 'surge', 'cipher', 'strike', 'depths']),
  puzzleFamilyId: z.string().min(1),
  puzzleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  elapsedMs: z.number().int().min(0),
  familyMetrics: FamilyMetricsSchema
})

export interface SubmitResultPayload {
  playerId: string
  category: PuzzleCategory
  puzzleFamilyId: string
  puzzleDate: string
  elapsedMs: number
  familyMetrics: z.infer<typeof FamilyMetricsSchema>
}

export interface SubmitResultResponse {
  success: boolean
  error?: string
  normalizedScore?: number
  status?: 'solved' | 'failed'
  currentStreak?: number
  longestStreak?: number
  newMilestone?: number | null
}

// Server-side score computation from raw metrics - no client score is trusted.
function computeScore(metrics: z.infer<typeof FamilyMetricsSchema>): number {
  switch (metrics.family) {
    case 'arkalon_vision':
      return scoreRecall(metrics.rounds)
    case 'surge_frenzy':
      return scoreSurge(metrics.nodes, metrics.expectedNodeCount)
    case 'sniper_challenge':
      return scoreStrike(metrics.shots)
    case 'wild_prediction':
      return scoreCipher({
        correctRounds: metrics.correctRounds,
        totalRounds: metrics.totalRounds,
        totalIncorrectGuesses: metrics.totalIncorrectGuesses
      })
    case 'crystal_mine':
      return scoreDepths({
        depositsFound: metrics.depositsFound,
        totalDeposits: metrics.totalDeposits,
        chargesUsed: metrics.chargesUsed,
        chargeLimit: metrics.chargeLimit
      })
  }
}

function getElapsedMs(metrics: z.infer<typeof FamilyMetricsSchema>): number {
  return metrics.totalElapsedMs
}

export async function submitResult(
  payload: SubmitResultPayload
): Promise<SubmitResultResponse> {
  const parsed = SubmitSchema.safeParse(payload)
  if (!parsed.success) {
    return { success: false, error: 'Invalid payload' }
  }

  const { playerId, category, puzzleFamilyId, puzzleDate, familyMetrics } =
    parsed.data

  if (!checkRateLimit(playerId)) {
    return { success: false, error: 'Too many submissions. Please wait.' }
  }

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

    // Validate puzzle date is today UTC
    const todayUtc = new Date().toISOString().slice(0, 10)
    if (puzzleDate !== todayUtc) {
      return { success: false, error: 'Invalid puzzle date' }
    }

    // Recompute score server-side - never trust client value
    const normalizedScore = computeScore(familyMetrics)
    const elapsedMs = getElapsedMs(familyMetrics)
    const status = isSolved(normalizedScore) ? 'solved' : 'failed'

    // Insert result - unique constraint enforces one attempt per player/date/category
    try {
      await client.query(
        `INSERT INTO daily_results
            (id, player_id, puzzle_date, category, puzzle_family_id,
            status, normalized_score, elapsed_ms, family_specific_metrics, submitted_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, now())`,
        [
          playerId,
          puzzleDate,
          category,
          puzzleFamilyId,
          status,
          normalizedScore,
          elapsedMs,
          JSON.stringify(familyMetrics)
        ]
      )
    } catch (err: unknown) {
      // Unique constraint violation = already submitted
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        return { success: false, error: 'Already submitted for today' }
      }
      throw err
    }

    // Recompute streak
    const { currentStreak, longestStreak } = await recomputeStreak(
      client,
      playerId,
      category
    )

    // Upsert streak row
    await client.query(
      `INSERT INTO category_streaks (player_id, category, current_streak, longest_streak)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (player_id, category)
        DO UPDATE SET
          current_streak = EXCLUDED.current_streak,
          longest_streak = GREATEST(category_streaks.longest_streak, EXCLUDED.longest_streak)`,
      [playerId, category, currentStreak, longestStreak]
    )

    // Check for new streak milestone (7 / 30 / 100 / 365)
    const MILESTONES = [7, 30, 100, 365]
    let newMilestone: number | null = null

    for (const milestone of MILESTONES) {
      if (currentStreak >= milestone) {
        const milestoneKey = `${category}:${milestone}`
        const celebratedRow = await client.query(
          `SELECT milestones_celebrated FROM players WHERE id = $1`,
          [playerId]
        )
        const celebrated: string[] =
          celebratedRow.rows[0]?.milestones_celebrated ?? []
        if (!celebrated.includes(milestoneKey)) {
          await client.query(
            `UPDATE players
              SET milestones_celebrated = array_append(milestones_celebrated, $2)
              WHERE id = $1`,
            [playerId, milestoneKey]
          )
          newMilestone = milestone
          break // Surface only the highest uncelebrated milestone
        }
      }
    }

    await client.query(
      `UPDATE players SET last_seen_at = now() WHERE id = $1`,
      [playerId]
    )

    return {
      success: true,
      normalizedScore,
      status,
      currentStreak,
      longestStreak,
      newMilestone
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
