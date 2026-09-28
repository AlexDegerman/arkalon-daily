import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrCreateDailyPlayer } from '@/app/actions/getOrCreateDailyPlayer'
import { cookies } from 'next/headers'
import { CATEGORY_ORDER } from '@/constants/categories'

const { mockQuery, mockRelease, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: { connect: mockConnect }
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}))

// Simulate Network Hub failure to verify the fallback display name
vi.stubGlobal(
  'fetch',
  vi.fn().mockRejectedValue(new Error('Network unavailable'))
)

const CORE_ID = '33333333-3333-4333-8333-333333333333'

function mockCookiesWithIdentity() {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => {
      if (name === 'arkalon_core_id') return { value: CORE_ID }
      if (name === 'arkalon_session') return { value: 'session-token' }
      return undefined
    },
    set: vi.fn()
  } as never)
}

function setupDb(existingName: string | null) {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('SELECT id, display_name FROM players')) {
      return Promise.resolve({
        rows: existingName ? [{ id: CORE_ID, display_name: existingName }] : []
      })
    }
    return Promise.resolve({ rows: [] })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
  mockCookiesWithIdentity()
})

describe('getOrCreateDailyPlayer', () => {
  it('returns the stored display name for an existing player', async () => {
    setupDb('AncientGoldTurtle')
    const res = await getOrCreateDailyPlayer()
    expect(res.coreId).toBe(CORE_ID)
    expect(res.displayName).toBe('AncientGoldTurtle')
  })

  it('creates a new player and initializes category streaks when not found', async () => {
    setupDb(null)
    const res = await getOrCreateDailyPlayer()
    expect(res.coreId).toBe(CORE_ID)
    expect(res.displayName).toBe('Player')

    const playerInserts = mockQuery.mock.calls.filter((call) =>
      String(call[0]).includes('INSERT INTO players')
    )
    expect(playerInserts).toHaveLength(1)

    const streakInserts = mockQuery.mock.calls.filter((call) =>
      String(call[0]).includes('INSERT INTO category_streaks')
    )
    expect(streakInserts).toHaveLength(CATEGORY_ORDER.length)
  })

  it('releases the database client after provisioning', async () => {
    setupDb(null)
    await getOrCreateDailyPlayer()
    expect(mockRelease).toHaveBeenCalled()
  })
})
