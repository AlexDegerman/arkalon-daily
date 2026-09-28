import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rerollPlayerName } from '@/app/actions/rerollPlayerName'
import { cookies } from 'next/headers'

const { mockQuery, mockRelease, mockConnect, mockFetch } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn(),
  mockFetch: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: { connect: mockConnect }
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}))

const CORE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

function mockCookies(coreId: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => {
      if (name === 'arkalon_core_id' && coreId) return { value: coreId }
      return undefined
    }
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('rerollPlayerName', () => {
  it('returns an error when there is no active session', async () => {
    mockCookies(undefined)
    const res = await rerollPlayerName()
    expect(res.success).toBe(false)
    expect(res.error).toBe('No active session')
  })

  it('returns an error when the network hub fails', async () => {
    mockCookies(CORE_ID)
    mockFetch.mockResolvedValue({ ok: false } as never)
    const res = await rerollPlayerName()
    expect(res.success).toBe(false)
    expect(res.error).toBe('Network Hub failed to reroll')
  })

  it('syncs the new nickname to the local database', async () => {
    mockCookies(CORE_ID)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nickname: 'NewShinyName' })
    } as never)
    mockQuery.mockResolvedValue({ rows: [] })
    const res = await rerollPlayerName()
    expect(res.success).toBe(true)
    expect(res.nickname).toBe('NewShinyName')
    const updateCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('display_name')
    )
    expect(updateCall).toBeDefined()
    expect(updateCall![1]).toEqual(['NewShinyName', CORE_ID])
    expect(mockRelease).toHaveBeenCalled()
  })

  it('returns an internal error when the fetch throws', async () => {
    mockCookies(CORE_ID)
    mockFetch.mockRejectedValue(new Error('network down'))
    const res = await rerollPlayerName()
    expect(res.success).toBe(false)
    expect(res.error).toBe('Internal server error')
  })
})
