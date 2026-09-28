import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitResult, clearRateLimitMap } from '@/app/actions/submitResult'

const { mockQuery, mockRelease, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: { connect: mockConnect }
}))

const PLAYER_ID = '11111111-1111-4111-8111-111111111111'

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoUtc(n: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function validRecallPayload(playerId: string, puzzleDate = todayUtc()) {
  return {
    playerId,
    category: 'recall' as const,
    puzzleFamilyId: 'arkalon_vision',
    puzzleDate,
    elapsedMs: 12000,
    familyMetrics: {
      family: 'arkalon_vision' as const,
      rounds: [
        { correctGlyphs: 3, sequenceLength: 3, elapsedMs: 2400, errors: 0 },
        { correctGlyphs: 5, sequenceLength: 5, elapsedMs: 4000, errors: 0 },
        { correctGlyphs: 7, sequenceLength: 7, elapsedMs: 5600, errors: 0 }
      ],
      totalElapsedMs: 12000
    }
  }
}

function failedRecallPayload(playerId: string) {
  return {
    playerId,
    category: 'recall' as const,
    puzzleFamilyId: 'arkalon_vision',
    puzzleDate: todayUtc(),
    elapsedMs: 12000,
    familyMetrics: {
      family: 'arkalon_vision' as const,
      rounds: [
        { correctGlyphs: 0, sequenceLength: 3, elapsedMs: 2400, errors: 3 },
        { correctGlyphs: 0, sequenceLength: 5, elapsedMs: 4000, errors: 5 },
        { correctGlyphs: 0, sequenceLength: 7, elapsedMs: 5600, errors: 7 }
      ],
      totalElapsedMs: 12000
    }
  }
}

interface DbOptions {
  playerExists?: boolean
  insertErrorCode?: string
  results?: Array<{ puzzle_date: string; normalized_score: number }>
  longestStreak?: number
  milestonesCelebrated?: string[]
}

function setupDb(opts: DbOptions = {}) {
  const {
    playerExists = true,
    insertErrorCode,
    results = [],
    longestStreak = 0,
    milestonesCelebrated = []
  } = opts
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('milestones_celebrated')) {
      return Promise.resolve({
        rows: [{ milestones_celebrated: milestonesCelebrated }]
      })
    }
    if (sql.includes('SELECT id FROM players')) {
      return Promise.resolve({
        rows: playerExists ? [{ id: PLAYER_ID }] : []
      })
    }
    if (sql.includes('INSERT INTO daily_results')) {
      if (insertErrorCode) return Promise.reject({ code: insertErrorCode })
      return Promise.resolve({ rows: [] })
    }
    if (sql.includes('SELECT puzzle_date')) {
      return Promise.resolve({ rows: results })
    }
    if (sql.includes('SELECT longest_streak')) {
      return Promise.resolve({ rows: [{ longest_streak: longestStreak }] })
    }
    return Promise.resolve({ rows: [] })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  clearRateLimitMap()
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
})

describe('submitResult', () => {
  it('rejects an invalid payload', async () => {
    setupDb()
    const res = await submitResult({
      playerId: 'not-a-uuid',
      category: 'recall',
      puzzleFamilyId: 'arkalon_vision',
      puzzleDate: todayUtc(),
      elapsedMs: 1,
      familyMetrics: {
        family: 'arkalon_vision',
        rounds: [],
        totalElapsedMs: 1
      }
    } as never)
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid payload')
  })

  it('rejects when the player does not exist', async () => {
    setupDb({ playerExists: false })
    const res = await submitResult(validRecallPayload(PLAYER_ID))
    expect(res.success).toBe(false)
    expect(res.error).toBe('Player not found')
  })

  it('rejects a puzzle date that is not today UTC', async () => {
    setupDb()
    const res = await submitResult(validRecallPayload(PLAYER_ID, '2020-01-01'))
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid puzzle date')
  })

  it('recomputes the score server-side and returns a solved result', async () => {
    setupDb({
      results: [{ puzzle_date: todayUtc(), normalized_score: 100 }]
    })
    const res = await submitResult(validRecallPayload(PLAYER_ID))
    expect(res.success).toBe(true)
    expect(res.normalizedScore).toBe(100)
    expect(res.status).toBe('solved')
    expect(res.currentStreak).toBe(1)
    expect(mockRelease).toHaveBeenCalled()
  })

  it('marks a low score as failed', async () => {
    setupDb({
      results: [{ puzzle_date: todayUtc(), normalized_score: 0 }]
    })
    const res = await submitResult(failedRecallPayload(PLAYER_ID))
    expect(res.success).toBe(true)
    expect(res.normalizedScore).toBe(0)
    expect(res.status).toBe('failed')
  })

  it('blocks duplicate submissions via the unique constraint', async () => {
    setupDb({ insertErrorCode: '23505' })
    const res = await submitResult(validRecallPayload(PLAYER_ID))
    expect(res.success).toBe(false)
    expect(res.error).toBe('Already submitted for today')
  })

  it('rate-limits after five submissions in the window', async () => {
    setupDb({ playerExists: false })
    const ratePlayer = '99999999-9999-4999-8999-999999999999'
    let last: Awaited<ReturnType<typeof submitResult>> | undefined
    for (let i = 0; i < 6; i++) {
      last = await submitResult(validRecallPayload(ratePlayer))
    }
    expect(last?.success).toBe(false)
    expect(last?.error).toBe('Too many submissions. Please wait.')
  })

  it('celebrates a new streak milestone once', async () => {
    const results = Array.from({ length: 7 }, (_, i) => ({
      puzzle_date: daysAgoUtc(i),
      normalized_score: 80
    }))
    setupDb({ results, longestStreak: 0, milestonesCelebrated: [] })
    const res = await submitResult(validRecallPayload(PLAYER_ID))
    expect(res.success).toBe(true)
    expect(res.currentStreak).toBe(7)
    expect(res.newMilestone).toBe(7)
  })

  it('does not re-celebrate an already celebrated milestone', async () => {
    const results = Array.from({ length: 7 }, (_, i) => ({
      puzzle_date: daysAgoUtc(i),
      normalized_score: 80
    }))
    setupDb({
      results,
      longestStreak: 7,
      milestonesCelebrated: ['recall:7']
    })
    const res = await submitResult(validRecallPayload(PLAYER_ID))
    expect(res.success).toBe(true)
    expect(res.currentStreak).toBe(7)
    expect(res.newMilestone).toBeNull()
  })
})
