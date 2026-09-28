import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/health/route'

const { mockQuery, mockRelease, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: { connect: mockConnect }
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/health', () => {
  it('returns ok when the database responds', async () => {
    mockConnect.mockResolvedValue({
      query: mockQuery.mockResolvedValue({ rows: [] }),
      release: mockRelease
    })
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1')
    expect(mockRelease).toHaveBeenCalled()
  })

  it('returns 503 when the connection fails', async () => {
    mockConnect.mockRejectedValue(new Error('connection refused'))
    const res = await GET()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ status: 'error' })
  })

  it('returns 503 when the probe query fails and still releases', async () => {
    mockConnect.mockResolvedValue({
      query: mockQuery.mockRejectedValue(new Error('query failed')),
      release: mockRelease
    })
    const res = await GET()
    expect(res.status).toBe(503)
    expect(mockRelease).toHaveBeenCalled()
  })
})
