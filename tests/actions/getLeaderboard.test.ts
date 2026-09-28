import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getLeaderboard,
  clearLeaderboardCache
} from '@/app/actions/getLeaderboard'

const { mockQuery, mockRelease, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: {
    query: mockQuery,
    connect: mockConnect
  }
}))

const PLAYER_ID = '55555555-5555-4555-8555-555555555555'

function setupDb(opts: {
  topRows?: Array<{
    player_id: string
    short_id: string | null
    display_name: string | null
    normalized_score: number
    elapsed_ms: number
  }>
  playerRank?: number | null
  totalPlayers?: number
}) {
  const { topRows = [], playerRank = null, totalPlayers = 0 } = opts
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('ORDER BY') && sql.includes('normalized_score DESC')) {
      return Promise.resolve({ rows: topRows })
    }
    if (sql.includes('COUNT(*) AS total')) {
      return Promise.resolve({ rows: [{ total: String(totalPlayers) }] })
    }
    if (sql.includes('COUNT(*) + 1 AS rank')) {
      return Promise.resolve({ rows: [{ rank: String(playerRank ?? 1) }] })
    }
    if (sql.includes('SELECT dr.normalized_score, dr.elapsed_ms')) {
      if (playerRank !== null) {
        return Promise.resolve({
          rows: [
            {
              normalized_score: 80,
              elapsed_ms: 15000,
              display_name: 'You',
              short_id: 'you'
            }
          ]
        })
      }
      return Promise.resolve({ rows: [] })
    }
    return Promise.resolve({ rows: [] })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  clearLeaderboardCache()
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
})

describe('getLeaderboard', () => {
  it('rejects invalid periods', async () => {
    setupDb({})
    const res = await getLeaderboard(PLAYER_ID, 'recall', 'monthly' as any)
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid input')
  })

  it('rejects invalid categories', async () => {
    setupDb({})
    const res = await getLeaderboard(PLAYER_ID, 'chess' as any, 'daily')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid input')
  })

  it('returns top 50 ordered by score DESC, elapsed ASC', async () => {
    const topRows = [
      {
        player_id: '1',
        short_id: '1',
        display_name: 'Alice',
        normalized_score: 100,
        elapsed_ms: 10000
      },
      {
        player_id: '2',
        short_id: '2',
        display_name: 'Bob',
        normalized_score: 100,
        elapsed_ms: 12000
      },
      {
        player_id: '3',
        short_id: '3',
        display_name: 'Charlie',
        normalized_score: 95,
        elapsed_ms: 8000
      }
    ]
    setupDb({ topRows, totalPlayers: 3 })
    const res = await getLeaderboard(PLAYER_ID, 'recall', 'daily')
    expect(res.success).toBe(true)
    expect(res.entries).toHaveLength(3)
    expect(res.entries![0].displayName).toBe('Alice')
    expect(res.entries![1].displayName).toBe('Bob')
    expect(res.entries![2].displayName).toBe('Charlie')
  })

  it('returns the exact rank and total players for a player outside the top 50', async () => {
    setupDb({
      topRows: Array.from({ length: 50 }, (_, i) => ({
        player_id: `p${i}`,
        short_id: `p${i}`,
        display_name: `Player${i}`,
        normalized_score: 100 - i,
        elapsed_ms: 10000
      })),
      playerRank: 142,
      totalPlayers: 500
    })
    const res = await getLeaderboard(PLAYER_ID, 'recall', 'daily')
    expect(res.success).toBe(true)
    expect(res.entries).toHaveLength(50)
    expect(res.playerRank).toBe(142)
    expect(res.totalPlayers).toBe(500)
  })

  it('returns null playerRank if the player has not played', async () => {
    setupDb({ topRows: [], playerRank: null, totalPlayers: 0 })
    const res = await getLeaderboard(PLAYER_ID, 'recall', 'daily')
    expect(res.success).toBe(true)
    expect(res.playerRank).toBeNull()
  })

  it('queries the database', async () => {
    setupDb({})
    await getLeaderboard(PLAYER_ID, 'total', 'daily')
    expect(mockQuery).toHaveBeenCalled()
  })
})
