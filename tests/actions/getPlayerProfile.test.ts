import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPlayerProfile } from '@/app/actions/getPlayerProfile'
import { getOrCreateDailyPlayer } from '@/app/actions/getOrCreateDailyPlayer'
import { CATEGORY_ORDER } from '@/constants/categories'

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: {
    query: mockQuery
  }
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}))

vi.mock('@/app/actions/getOrCreateDailyPlayer', () => ({
  getOrCreateDailyPlayer: vi.fn()
}))

const PLAYER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

interface ProfileDbOptions {
  playerExists?: boolean
  daysPlayed?: number
  bestScore?: number | null
  avgScore?: string | null
  totalPlayers?: number
  playersAbove?: number
}

function setupProfileDb(opts: ProfileDbOptions = {}) {
  const {
    playerExists = true,
    daysPlayed = 5,
    bestScore = 80,
    avgScore = '75.0',
    totalPlayers = 30,
    playersAbove = 6
  } = opts

  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('players_above')) {
      return Promise.resolve({
        rows: [
          {
            total_players: String(totalPlayers),
            players_above: String(playersAbove)
          }
        ]
      })
    }

    if (sql.includes('short_id = $1')) {
      return Promise.resolve({
        rows: playerExists ? [{ id: PLAYER_ID }] : []
      })
    }

    if (sql.includes('display_name') && sql.includes('FROM players')) {
      return Promise.resolve({
        rows: playerExists
          ? [
              {
                id: PLAYER_ID,
                short_id: 'test',
                display_name: 'TestPlayer',
                created_at: '2026-01-01T00:00:00.000Z',
                trials_completed: ['recall'],
                recovery_tutorial_shown: false
              }
            ]
          : []
      })
    }

    if (sql.includes('last_seen_at')) {
      return Promise.resolve({ rows: [] })
    }

    if (sql.includes('category_streaks')) {
      return Promise.resolve({
        rows: [
          {
            category: 'recall',
            current_streak: 3,
            longest_streak: 7
          }
        ]
      })
    }

    if (sql.includes('COUNT(*)::text AS count')) {
      return Promise.resolve({
        rows: [
          {
            category: 'recall',
            count: String(daysPlayed),
            best_score: bestScore,
            avg_score: avgScore
          }
        ]
      })
    }

    if (sql.includes('puzzle_date = $2')) {
      return Promise.resolve({ rows: [] })
    }

    return Promise.resolve({ rows: [] })
  })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getPlayerProfile', () => {
  it('returns the profile and per-category stats for a valid player', async () => {
    setupProfileDb()
    const res = await getPlayerProfile(PLAYER_ID)

    expect(res.success).toBe(true)
    expect(res.profile?.displayName).toBe('TestPlayer')
    expect(res.profile?.trialsCompleted).toEqual(['recall'])
    expect(res.stats).toHaveLength(CATEGORY_ORDER.length)

    const recall = res.stats!.find((s) => s.category === 'recall')
    expect(recall?.bestScore).toBe(80)
    expect(recall?.currentStreak).toBe(3)
    expect(recall?.longestStreak).toBe(7)
  })

  it('exposes the global percentile over a large enough population', async () => {
    setupProfileDb({ totalPlayers: 30, playersAbove: 6 })
    const res = await getPlayerProfile(PLAYER_ID)

    expect(res.success).toBe(true)
    const recall = res.stats!.find((s) => s.category === 'recall')
    expect(recall?.globalPercentile).toBe(20)
  })

  it('suppresses the percentile below a 25-player population', async () => {
    setupProfileDb({ totalPlayers: 10, playersAbove: 2 })
    const res = await getPlayerProfile(PLAYER_ID)

    expect(res.success).toBe(true)
    const recall = res.stats!.find((s) => s.category === 'recall')
    expect(recall?.globalPercentile).toBeNull()
  })

  it('floors the percentile at 1 for the category leader', async () => {
    setupProfileDb({ totalPlayers: 30, playersAbove: 0 })
    const res = await getPlayerProfile(PLAYER_ID)

    expect(res.success).toBe(true)
    const recall = res.stats!.find((s) => s.category === 'recall')
    expect(recall?.globalPercentile).toBe(1)
  })

  it('hides the average score until 3 submissions exist', async () => {
    setupProfileDb({ daysPlayed: 2, avgScore: '75.0' })
    const res = await getPlayerProfile(PLAYER_ID)

    expect(res.success).toBe(true)
    const recall = res.stats!.find((s) => s.category === 'recall')
    expect(recall?.averageScore).toBe(0)
    expect(recall?.daysPlayed).toBe(2)
  })

  it('returns an error when the player cannot be found or provisioned', async () => {
    vi.mocked(getOrCreateDailyPlayer).mockResolvedValue({
      coreId: PLAYER_ID,
      displayName: 'TestPlayer'
    })
    mockQuery.mockResolvedValue({ rows: [] })

    const res = await getPlayerProfile(PLAYER_ID)

    expect(res.success).toBe(false)
    expect(res.error).toBe('Player not found')
  })
})
