'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'

const Schema = z.object({
  recoveryCode: z
    .string()
    .min(1)
    .max(30)
    .regex(
      /^[A-Z0-9-]+$/,
      'Code must contain only letters, numbers, and hyphens'
    )
})

export interface RestoreProfileResult {
  success: boolean
  error?: string
  playerId?: string
  displayName?: string
}

// Looks up a player by recovery code and returns their UUID.
// The client stores the returned UUID in localStorage to restore the session.
export async function restoreProfile(
  recoveryCode: string
): Promise<RestoreProfileResult> {
  const parsed = Schema.safeParse({
    recoveryCode: recoveryCode.trim().toUpperCase()
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid code format' }
  }

  const client = await pool.connect()
  try {
    const row = await client.query<{
      id: string
      display_name: string | null
      recovery_code: string
    }>(
      `SELECT id, display_name, recovery_code
       FROM players
       WHERE recovery_code = $1`,
      [parsed.data.recoveryCode]
    )

    if (row.rows.length === 0) {
      return {
        success: false,
        error: 'Code not found. Check for typos and try again.'
      }
    }

    const player = row.rows[0]

    // Update last_seen_at on restore
    await client.query(
      `UPDATE players SET last_seen_at = now() WHERE id = $1`,
      [player.id]
    )

    const displayName =
      player.display_name ??
      player.recovery_code
        .split('-')
        .map(
          (p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
        )
        .join('')

    return { success: true, playerId: player.id, displayName }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
