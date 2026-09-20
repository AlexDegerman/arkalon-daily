import 'server-only'

import { generateRecoveryCode } from '@/lib/nicknames'
import type { PoolClient } from 'pg'

const MAX_RETRIES = 10

// Generates a unique recovery code, collision-checking against the players table.
// Falls back to a 5-digit suffix after MAX_RETRIES standard 4-digit attempts.
export async function generateUniqueRecoveryCode(
  client: PoolClient
): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateRecoveryCode()
    const existing = await client.query(
      `SELECT id FROM players WHERE recovery_code = $1`,
      [code]
    )
    if (existing.rows.length === 0) return code
  }

  // Fallback: 5-digit suffix to break collision
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const adj = generateRecoveryCode().split('-')[0]
    const animal = generateRecoveryCode().split('-')[1]
    const digits = String(Math.floor(Math.random() * 90000) + 10000)
    const code = `${adj}-${animal}-${digits}`
    const existing = await client.query(
      `SELECT id FROM players WHERE recovery_code = $1`,
      [code]
    )
    if (existing.rows.length === 0) return code
  }

  throw new Error('Could not generate a unique recovery code after retries')
}
