import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDailyChallenge,
  clearDailyChallengeCache
} from '@/app/actions/getDailyChallenge'

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

const PLAYER_ID = '22222222-2222-4222-8222-222222222222'
const CATEGORY = 'recall' as const
const SEED = 'a1b2c3d4'

interface DbOptions {
  playerExists?: boolean
  trialsCompleted?: string[]
  alreadyPlayed?: boolean
  savedScore?: number
  puzzleRow?: boolean
  streak?: number
}

function setupDb(opts: DbOptions = {}) {
  const {
    playerExists = true,
    trialsCompleted = [],
    alreadyPlayed = false,
    savedScore = 0,
    puzzleRow = true,
    streak = 0
  } = opts
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('SELECT id, trials_completed FROM players')) {
      return Promise.resolve({
        rows: playerExists
          ? [{ id: PLAYER_ID, trials_completed: trialsCompleted }]
          : []
      })
    }
    if (sql.includes('FROM daily_results')) {
      return Promise.resolve({
        rows: alreadyPlayed
          ? [
              {
                normalized_score: savedScore,
                family_specific_metrics: { rounds: [] }
              }
            ]
          : []
      })
    }
    if (sql.includes('FROM daily_puzzles')) {
      return Promise.resolve({
        rows: puzzleRow
          ? [
              {
                puzzle_date: '2026-01-01',
                category: CATEGORY,
                puzzle_family_id: 'arkalon_vision',
                family_index: 1,
                seed: SEED
              }
            ]
          : []
      })
    }
    if (sql.includes('FROM category_streaks')) {
      return Promise.resolve({ rows: [{ current_streak: streak }] })
    }
    return Promise.resolve({ rows: [] })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  clearDailyChallengeCache()
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
})

describe('getDailyChallenge', () => {
  it('rejects invalid input', async () => {
    setupDb()
    const res = await getDailyChallenge('bad-id', CATEGORY)
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid input')
  })

  it('rejects when the player does not exist', async () => {
    setupDb({ playerExists: false })
    const res = await getDailyChallenge(PLAYER_ID, CATEGORY)
    expect(res.success).toBe(false)
    expect(res.error).toBe('Player not found')
  })

  it('returns the stored attempt when already played today', async () => {
    setupDb({ alreadyPlayed: true, savedScore: 85, streak: 2 })
    const res = await getDailyChallenge(PLAYER_ID, CATEGORY)
    expect(res.success).toBe(true)
    expect(res.alreadyPlayed).toBe(true)
    expect(res.savedScore).toBe(85)
    expect(res.streakDays).toBe(2)
    expect(res.puzzleInfo?.puzzleFamilyId).toBe('arkalon_vision')
    expect(res.seedData).toBeDefined()
  })

  it('errors when no puzzle has been generated for today', async () => {
    setupDb({ puzzleRow: false })
    const res = await getDailyChallenge(PLAYER_ID, CATEGORY)
    expect(res.success).toBe(false)
    expect(res.error).toContain('No puzzle generated')
  })

  it('returns deterministic seed data and puzzle info for a fresh challenge', async () => {
    setupDb({ trialsCompleted: ['recall'], streak: 3 })
    const res = await getDailyChallenge(PLAYER_ID, CATEGORY)
    expect(res.success).toBe(true)
    expect(res.puzzleInfo?.puzzleFamilyId).toBe('arkalon_vision')
    expect(res.puzzleInfo?.familyIndex).toBe(1)
    expect(res.streakDays).toBe(3)
    expect(res.trialsCompleted).toEqual(['recall'])
    expect(res.seedData).toBeDefined()
    expect(res.seedData?.profile).toBeDefined()
    expect(res.seedData?.familyData).toBeDefined()
  })

  it('generates identical seed data across repeated calls for the same seed', async () => {
    setupDb({ trialsCompleted: ['recall'] })
    const first = await getDailyChallenge(PLAYER_ID, CATEGORY)
    const second = await getDailyChallenge(PLAYER_ID, CATEGORY)
    expect(first.seedData).toEqual(second.seedData)
  })
})
