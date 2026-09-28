import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markRecoveryTutorialShown } from '@/app/actions/markRecoveryTutorialShown'

const { mockQuery, mockRelease, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: { connect: mockConnect }
}))

const PLAYER_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

beforeEach(() => {
  vi.clearAllMocks()
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
})

describe('markRecoveryTutorialShown', () => {
  it('rejects an invalid player id without opening a connection', async () => {
    const res = await markRecoveryTutorialShown('not-a-uuid')
    expect(res.success).toBe(false)
    expect(mockConnect).not.toHaveBeenCalled()
  })

  it('marks the tutorial as shown', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    const res = await markRecoveryTutorialShown(PLAYER_ID)
    expect(res.success).toBe(true)
    const updateCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('recovery_tutorial_shown')
    )
    expect(updateCall).toBeDefined()
    expect(updateCall![1]).toEqual([PLAYER_ID])
  })

  it('returns false when the update fails', async () => {
    mockQuery.mockRejectedValue(new Error('db error'))
    const res = await markRecoveryTutorialShown(PLAYER_ID)
    expect(res.success).toBe(false)
    expect(mockRelease).toHaveBeenCalled()
  })

  it('releases the client on success', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await markRecoveryTutorialShown(PLAYER_ID)
    expect(mockRelease).toHaveBeenCalled()
  })
})
