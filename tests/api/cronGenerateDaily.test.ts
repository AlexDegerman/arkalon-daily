import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/generate-daily/route'
import { generateDailySeeds } from '@/app/actions/generateDailySeeds'

vi.mock('@/app/actions/generateDailySeeds', () => ({
  generateDailySeeds: vi.fn()
}))

const SECRET = 'test-cron-secret'
const ORIGINAL = process.env.CRON_SECRET

function makeRequest(auth?: string) {
  const headers = new Headers()
  if (auth) headers.set('authorization', auth)
  return new NextRequest('http://localhost/api/cron/generate-daily', {
    headers
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = SECRET
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL
})

describe('GET /api/cron/generate-daily', () => {
  it('rejects requests without an authorization header', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(generateDailySeeds).not.toHaveBeenCalled()
  })

  it('rejects requests with the wrong bearer token', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    expect(generateDailySeeds).not.toHaveBeenCalled()
  })

  it('runs seed generation for a valid bearer token', async () => {
    vi.mocked(generateDailySeeds).mockResolvedValue({
      generated: 5,
      skipped: 0,
      errors: []
    })
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    expect(generateDailySeeds).toHaveBeenCalledTimes(1)
    expect(await res.json()).toEqual({
      generated: 5,
      skipped: 0,
      errors: []
    })
  })

  it('returns 500 when seed generation throws', async () => {
    vi.mocked(generateDailySeeds).mockRejectedValue(new Error('db down'))
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'db down' })
  })
})
