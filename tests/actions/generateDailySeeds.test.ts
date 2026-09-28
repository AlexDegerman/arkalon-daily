import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateDailySeeds } from '@/app/actions/generateDailySeeds'
import { CATEGORY_ORDER } from '@/constants/categories'

const { mockQuery, mockRelease, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: { connect: mockConnect }
}))

const ORIGINAL_SECRET = process.env.HMAC_SERVER_SECRET

beforeEach(() => {
  vi.clearAllMocks()
  process.env.HMAC_SERVER_SECRET = 'test_daily_seed_secret'
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.HMAC_SERVER_SECRET
  else process.env.HMAC_SERVER_SECRET = ORIGINAL_SECRET
})

function setupDb(
  opts: {
    existingCategories?: string[]
    maxIndex?: Record<string, number>
  } = {}
) {
  const { existingCategories = [], maxIndex = {} } = opts
  mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
    if (sql.includes('MAX(family_index)')) {
      const rows = Object.entries(maxIndex).map(([category, idx]) => ({
        category,
        max_index: idx
      }))
      return Promise.resolve({ rows })
    }
    if (sql.includes('SELECT id FROM daily_puzzles')) {
      const category = params?.[1] as string
      return Promise.resolve({
        rows: existingCategories.includes(category) ? [{ id: 'x' }] : []
      })
    }
    return Promise.resolve({ rows: [] })
  })
}

describe('generateDailySeeds', () => {
  it('generates a seed for every category when none exist', async () => {
    setupDb({ existingCategories: [] })
    const res = await generateDailySeeds('2026-03-01')
    expect(res.generated).toBe(CATEGORY_ORDER.length)
    expect(res.skipped).toBe(0)
    expect(res.errors).toEqual([])
  })

  it('skips categories that already have a puzzle', async () => {
    setupDb({ existingCategories: [...CATEGORY_ORDER] })
    const res = await generateDailySeeds('2026-03-01')
    expect(res.generated).toBe(0)
    expect(res.skipped).toBe(CATEGORY_ORDER.length)
  })

  it('generates only the missing categories in a partial state', async () => {
    setupDb({ existingCategories: ['recall', 'surge'] })
    const res = await generateDailySeeds('2026-03-01')
    expect(res.generated).toBe(3)
    expect(res.skipped).toBe(2)
  })

  it('increments family_index from the stored maximum', async () => {
    setupDb({ existingCategories: [], maxIndex: { recall: 4 } })
    await generateDailySeeds('2026-03-01')
    const insertCalls = mockQuery.mock.calls.filter((call) =>
      String(call[0]).includes('INSERT INTO daily_puzzles')
    )
    const recallInsert = insertCalls.find(
      (call) => (call[1] as unknown[])?.[1] === 'recall'
    )
    expect(recallInsert).toBeDefined()
    // params: [date, category, familyId, newIndex, seed]
    expect((recallInsert![1] as unknown[])[3]).toBe(5)
  })

  it('isolates errors per category and continues', async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('MAX(family_index)')) {
        return Promise.resolve({ rows: [] })
      }
      if (sql.includes('SELECT id FROM daily_puzzles')) {
        return Promise.resolve({ rows: [] })
      }
      if (sql.includes('INSERT INTO daily_puzzles')) {
        const category = params?.[1] as string
        if (category === 'recall') {
          return Promise.reject(new Error('insert failed'))
        }
        return Promise.resolve({ rows: [] })
      }
      return Promise.resolve({ rows: [] })
    })
    const res = await generateDailySeeds('2026-03-01')
    expect(res.generated).toBe(4)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toContain('recall')
  })

  it('defaults to today UTC when no date is provided', async () => {
    setupDb({ existingCategories: [...CATEGORY_ORDER] })
    const res = await generateDailySeeds()
    expect(res.skipped).toBe(CATEGORY_ORDER.length)
  })
})
