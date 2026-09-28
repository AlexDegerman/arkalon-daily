import { describe, it, expect, vi, beforeEach } from 'vitest'
import { completeTrial } from '@/app/actions/completeTrial'

const { mockQuery, mockRelease, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: { connect: mockConnect }
}))

const PLAYER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

beforeEach(() => {
  vi.clearAllMocks()
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
})

describe('completeTrial', () => {
  it('rejects invalid input', async () => {
    const res = await completeTrial('not-a-uuid', 'recall')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid input')
  })

  it('rejects an unknown category', async () => {
    const res = await completeTrial(PLAYER_ID, 'chess' as never)
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid input')
  })

  it('returns an error when the player does not exist', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    const res = await completeTrial(PLAYER_ID, 'recall')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Player not found')
  })

  it('marks the trial as completed', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id FROM players')) {
        return Promise.resolve({ rows: [{ id: PLAYER_ID }] })
      }
      return Promise.resolve({ rows: [] })
    })
    const res = await completeTrial(PLAYER_ID, 'recall')
    expect(res.success).toBe(true)
  })

  it('uses an idempotent remove-then-append update', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: PLAYER_ID }] })
    await completeTrial(PLAYER_ID, 'surge')
    const updateCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('array_append')
    )
    expect(updateCall).toBeDefined()
    const sql = String(updateCall![0])
    expect(sql).toContain('array_remove')
    expect(sql).toContain('array_append')
    expect(updateCall![1]).toEqual([PLAYER_ID, 'surge'])
  })

  it('surfaces database errors and releases the client', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id FROM players')) {
        return Promise.resolve({ rows: [{ id: PLAYER_ID }] })
      }
      return Promise.reject(new Error('db down'))
    })
    const res = await completeTrial(PLAYER_ID, 'recall')
    expect(res.success).toBe(false)
    expect(res.error).toBe('db down')
    expect(mockRelease).toHaveBeenCalled()
  })
})
