import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCategoryStatuses } from '@/app/actions/getCategoryStatuses'
import { CATEGORY_ORDER } from '@/constants/categories'

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

const PLAYER_ID = '44444444-4444-4444-8444-444444444444'

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayUtc(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

interface DbOptions {
  todayResults?: Array<{ category: string; normalized_score: number }>
  yesterdayResults?: Array<{ category: string; normalized_score: number }>
  streaks?: Record<string, number>
  trialsCompleted?: string[]
}

function setupDb(opts: DbOptions = {}) {
  const {
    todayResults = [],
    yesterdayResults = [],
    streaks = {},
    trialsCompleted = []
  } = opts

  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('trials_completed')) {
      return Promise.resolve({ rows: [{ trials_completed: trialsCompleted }] })
    }
    if (sql.includes('FROM daily_results')) {
      const rows = [
        ...todayResults.map((r) => ({
          puzzle_date: todayUtc(),
          category: r.category,
          normalized_score: r.normalized_score,
          status: r.normalized_score >= 15 ? 'solved' : 'failed'
        })),
        ...yesterdayResults.map((r) => ({
          puzzle_date: yesterdayUtc(),
          category: r.category,
          normalized_score: r.normalized_score,
          status: r.normalized_score >= 15 ? 'solved' : 'failed'
        }))
      ]
      return Promise.resolve({ rows })
    }
    if (sql.includes('FROM category_streaks')) {
      const rows = CATEGORY_ORDER.map((cat) => ({
        category: cat,
        current_streak: streaks[cat] ?? 0
      }))
      return Promise.resolve({ rows })
    }
    return Promise.resolve({ rows: [] })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
})

describe('getCategoryStatuses', () => {
  it('rejects an invalid player id', async () => {
    setupDb()
    const res = await getCategoryStatuses('not-a-uuid')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid player ID')
  })

  it('returns all 5 categories with available status when trials are completed', async () => {
    setupDb({ trialsCompleted: CATEGORY_ORDER })
    const res = await getCategoryStatuses(PLAYER_ID)
    expect(res.success).toBe(true)
    expect(res.statuses).toHaveLength(CATEGORY_ORDER.length)
    for (const status of res.statuses!) {
      expect(status.status).toBe('available')
      expect(status.streakDays).toBe(0)
    }
  })

  it('maps a score >= 15 to solved and < 15 to failed', async () => {
    setupDb({
      todayResults: [
        { category: 'recall', normalized_score: 85 },
        { category: 'surge', normalized_score: 10 }
      ]
    })
    const res = await getCategoryStatuses(PLAYER_ID)
    expect(res.success).toBe(true)

    const recall = res.statuses!.find((s) => s.category === 'recall')
    expect(recall?.status).toBe('solved')
    expect(recall?.score).toBe(85)

    const surge = res.statuses!.find((s) => s.category === 'surge')
    expect(surge?.status).toBe('failed')
    expect(surge?.score).toBe(10)
  })

  it('maps unplayed categories to trial if trial is not completed', async () => {
    setupDb({ trialsCompleted: ['recall'] })
    const res = await getCategoryStatuses(PLAYER_ID)
    expect(res.success).toBe(true)

    const recall = res.statuses!.find((s) => s.category === 'recall')
    expect(recall?.status).toBe('available')

    const surge = res.statuses!.find((s) => s.category === 'surge')
    expect(surge?.status).toBe('trial')
  })

  it('attaches current streaks and yesterday scores', async () => {
    setupDb({
      streaks: { recall: 5, surge: 2 },
      yesterdayResults: [
        { category: 'recall', normalized_score: 92 },
        { category: 'strike', normalized_score: 45 }
      ]
    })
    const res = await getCategoryStatuses(PLAYER_ID)
    expect(res.success).toBe(true)

    const recall = res.statuses!.find((s) => s.category === 'recall')
    expect(recall?.streakDays).toBe(5)
    expect(recall?.yesterdayScore).toBe(92)

    const strike = res.statuses!.find((s) => s.category === 'strike')
    expect(strike?.streakDays).toBe(0)
    expect(strike?.yesterdayScore).toBe(45)
  })

  it('queries the database directly', async () => {
    setupDb()
    await getCategoryStatuses(PLAYER_ID)
    expect(mockQuery).toHaveBeenCalled()
  })
})
