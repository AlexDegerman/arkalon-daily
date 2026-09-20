'use server'

import 'server-only'

import { z } from 'zod'
import pool from '@/lib/db'

const Schema = z.object({ playerId: z.string().uuid() })

// Marks the recovery tutorial as shown so the overlay never appears again.
export async function markRecoveryTutorialShown(
  playerId: string
): Promise<{ success: boolean }> {
  const parsed = Schema.safeParse({ playerId })
  if (!parsed.success) return { success: false }

  const client = await pool.connect()
  try {
    await client.query(
      `UPDATE players SET recovery_tutorial_shown = true WHERE id = $1`,
      [playerId]
    )
    return { success: true }
  } catch {
    return { success: false }
  } finally {
    client.release()
  }
}
