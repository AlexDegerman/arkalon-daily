'use server'

import 'server-only'
import { cookies } from 'next/headers'
import pool from '@/lib/db'

export async function rerollPlayerName() {
  const cookieStore = await cookies()
  const coreId = cookieStore.get('arkalon_core_id')?.value

  if (!coreId) {
    return { success: false, error: 'No active session' }
  }

  try {
    // 1. Ask Network Hub to reroll master identity
    const networkUrl =
      process.env.INTERNAL_NETWORK_URL ?? 'http://arkalon-network:3000'
    const res = await fetch(`${networkUrl}/api/identity/reroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET || ''
      },
      body: JSON.stringify({ coreId })
    })

    if (!res.ok) {
      return { success: false, error: 'Network Hub failed to reroll' }
    }

    const data = await res.json()
    const newNickname: string = data.nickname

    // 2. Sync to Daily's local database
    const client = await pool.connect()
    try {
      await client.query(
        'UPDATE players SET display_name = $1, last_seen_at = now() WHERE id = $2',
        [newNickname, coreId]
      )
    } finally {
      client.release()
    }

    return { success: true, nickname: newNickname }
  } catch (err) {
    console.error('[rerollPlayerName]', err)
    return { success: false, error: 'Internal server error' }
  }
}
