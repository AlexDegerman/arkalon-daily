'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'
import type { PuzzleCategory } from '@/types/puzzle'

const Schema = z.object({
  playerId: z.string().uuid(),
  category: z.enum(['recall', 'surge', 'cipher', 'strike', 'depths'])
})

export interface CompleteTrialResult {
  success: boolean
  error?: string
}

// Marks a category's trial as completed for the player.
// Appends the category slug to players.trials_completed if not already present.
export async function completeTrial(
  playerId: string,
  category: PuzzleCategory
): Promise<CompleteTrialResult> {
  const parsed = Schema.safeParse({ playerId, category })
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
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

    await client.query(
      `UPDATE players
        SET trials_completed = array_append(
          array_remove(trials_completed, $2::text),
          $2::text
        )
        WHERE id = $1`,
      [playerId, category]
    )

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
