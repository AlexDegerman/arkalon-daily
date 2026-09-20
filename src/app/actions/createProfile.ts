'use server'

import 'server-only'

import pool from '@/lib/db'
import { generateUniqueRecoveryCode } from '@/lib/identity/recoveryCode'
import { recoveryCodeToDisplayName } from '@/lib/nicknames'
import { CATEGORY_ORDER } from '@/constants/categories'

export interface CreateProfileResult {
  success: boolean
  error?: string
  playerId?: string
  recoveryCode?: string
  displayName?: string
}

// Creates a new anonymous player profile and initialises streak rows.
// Returns the UUID stored in localStorage as arkalon_daily_player_id.
// Called from WelcomeModal on dismiss.
export async function createProfile(): Promise<CreateProfileResult> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const recoveryCode = await generateUniqueRecoveryCode(client)
    const displayName = recoveryCodeToDisplayName(recoveryCode)

    const result = await client.query<{ id: string }>(
      `INSERT INTO players
          (recovery_code, display_name, created_at, last_seen_at,
          milestones_celebrated, trials_completed, recovery_tutorial_shown)
        VALUES ($1, $2, now(), now(), '{}', '{}', false)
        RETURNING id`,
      [recoveryCode, displayName]
    )

    const playerId = result.rows[0].id

    // Initialise one streak row per category
    for (const category of CATEGORY_ORDER) {
      await client.query(
        `INSERT INTO category_streaks (player_id, category, current_streak, longest_streak)
          VALUES ($1, $2, 0, 0)
          ON CONFLICT (player_id, category) DO NOTHING`,
        [playerId, category]
      )
    }

    await client.query('COMMIT')

    return { success: true, playerId, recoveryCode, displayName }
  } catch (err) {
    await client.query('ROLLBACK')
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  } finally {
    client.release()
  }
}
