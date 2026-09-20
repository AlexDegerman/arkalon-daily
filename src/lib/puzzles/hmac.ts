import 'server-only'

import { createHmac } from 'crypto'

// Derives a deterministic daily seed from the server secret and puzzle category.
// The seed is kept server-side and never exposed to clients.
export function deriveDailySeed(puzzleDate: string, category: string): string {
  const secret = process.env.HMAC_SERVER_SECRET
  if (!secret) {
    throw new Error('HMAC_SERVER_SECRET is not set')
  }
  return createHmac('sha256', secret)
    .update(`${puzzleDate}:${category}`)
    .digest('hex')
}

export function getUtcDateString(date?: Date): string {
  const d = date ?? new Date()
  return d.toISOString().slice(0, 10)
}
