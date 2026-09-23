'use server'

import 'server-only'
import { cookies } from 'next/headers'
import pool from '@/lib/db'
import { CATEGORY_ORDER } from '@/constants/categories'

const CORE_ID_COOKIE = 'arkalon_core_id'
const SESSION_COOKIE = 'arkalon_session'
const ONE_YEAR = 31_536_000
const THIRTY_DAYS = 60 * 60 * 24 * 30

function cookieDomain(): string | undefined {
  if (process.env.NODE_ENV === 'development') return undefined
  return process.env.COOKIE_DOMAIN ?? '.rpsleague.fi'
}

export async function getOrCreateDailyPlayer() {
  const cookieStore = await cookies()
  let coreId = cookieStore.get(CORE_ID_COOKIE)?.value
  let sessionToken = cookieStore.get(SESSION_COOKIE)?.value
  let nickname: string | undefined
  let networkShortId: string | undefined

  // Local development: use a mock player because Arkalon Network is not running
  if (
    process.env.NODE_ENV === 'development' &&
    !process.env.INTERNAL_NETWORK_URL
  ) {
    coreId = '11111111-1111-4111-8111-111111111111'
    sessionToken = 'mock-dev-session-token'
    nickname = 'AncientGoldTurtle'
  }

  // 1. If no root cookie, request identity from Network Hub API
  if (!coreId || !sessionToken) {
    const networkUrl =
      process.env.INTERNAL_NETWORK_URL ?? 'http://arkalon-network:3000'
    const res = await fetch(`${networkUrl}/api/identity/provision`, {
      method: 'POST',
      headers: {
        'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET || ''
      }
    })

    if (!res.ok) {
      throw new Error('Failed to bootstrap identity from Arkalon Network')
    }

    const data = await res.json()
    coreId = data.coreId
    sessionToken = data.sessionToken
    nickname = data.nickname
    networkShortId = data.shortId

    // Set root cookies across .rpsleague.fi
    const domain = cookieDomain()
    cookieStore.set(CORE_ID_COOKIE, coreId!, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      ...(domain ? { domain } : {}),
      path: '/',
      maxAge: ONE_YEAR
    })
    cookieStore.set(SESSION_COOKIE, sessionToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      ...(domain ? { domain } : {}),
      path: '/',
      maxAge: THIRTY_DAYS
    })
  }

  // 2. Ensure player exists in Daily's local database
  const client = await pool.connect()
  try {
    const existing = await client.query(
      'SELECT id, display_name FROM players WHERE id = $1',
      [coreId]
    )

    if (existing.rows.length === 0) {
      const fallbackShortId = Math.random().toString(36).substring(2, 10)
      const assignedShortId = networkShortId ?? fallbackShortId

      await client.query(
        `INSERT INTO players (id, short_id, display_name, created_at, last_seen_at, milestones_celebrated, trials_completed)
          VALUES ($1, $2, $3, now(), now(), '{}', '{}')
          ON CONFLICT (id) DO UPDATE SET
            short_id = COALESCE(players.short_id, EXCLUDED.short_id)`,
        [coreId, assignedShortId, nickname ?? 'Player']
      )

      // Initialize category streaks
      for (const cat of CATEGORY_ORDER) {
        await client.query(
          `INSERT INTO category_streaks (player_id, category, current_streak, longest_streak)
            VALUES ($1, $2, 0, 0)
            ON CONFLICT DO NOTHING`,
          [coreId, cat]
        )
      }
    }

    return {
      coreId: coreId!,
      displayName: existing.rows[0]?.display_name ?? nickname ?? 'Player'
    }
  } finally {
    client.release()
  }
}
