import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTrialChallenge } from '@/app/actions/getTrialChallenge'
import { TRIAL_SEEDS } from '@/lib/puzzles/trialSeeds'
import { CATEGORY_ORDER } from '@/constants/categories'

const { mockQuery, mockRelease, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: { connect: mockConnect }
}))

const PLAYER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

beforeEach(() => {
  vi.clearAllMocks()
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
  mockQuery.mockResolvedValue({ rows: [{ id: PLAYER_ID }] })
})

describe('getTrialChallenge', () => {
  it('rejects invalid input', async () => {
    const res = await getTrialChallenge('bad-id', 'recall')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid input')
  })

  it('returns an error when the player does not exist', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    const res = await getTrialChallenge(PLAYER_ID, 'recall')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Player not found')
    expect(mockRelease).toHaveBeenCalled()
  })

  it('returns seed data for every category', async () => {
    for (const category of CATEGORY_ORDER) {
      const res = await getTrialChallenge(PLAYER_ID, category)
      expect(res.success, category).toBe(true)
      expect(res.seedData).toBeDefined()
      expect(res.seedData?.profile).toBeDefined()
      expect(res.seedData?.familyData).toBeDefined()
    }
  })

  it('produces identical trial data across repeated calls', async () => {
    const first = await getTrialChallenge(PLAYER_ID, 'recall')
    const second = await getTrialChallenge(PLAYER_ID, 'recall')
    expect(first.seedData).toEqual(second.seedData)
  })

  it('uses distinct fixed seeds per category', async () => {
    const seeds = CATEGORY_ORDER.map((c) => TRIAL_SEEDS[c])
    expect(new Set(seeds).size).toBe(seeds.length)
  })

  it('keeps recall trials free of reverse entry', async () => {
    const res = await getTrialChallenge(PLAYER_ID, 'recall')
    const familyData = res.seedData!.familyData as { reverseEntry?: boolean }
    expect(familyData.reverseEntry).toBe(false)
  })

  it('limits depths trials to adjacency_count clues on small grids', async () => {
    const res = await getTrialChallenge(PLAYER_ID, 'depths')
    const profile = res.seedData!.profile
    expect(profile.clueType).toBe('adjacency_count')
    expect(profile.gridSize ?? 0).toBeLessThanOrEqual(6)
  })
})
