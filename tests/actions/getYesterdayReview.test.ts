import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getYesterdayReview } from '@/app/actions/getYesterdayReview'

const { mockQuery, mockRelease, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
  mockConnect: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  default: { connect: mockConnect }
}))

const PLAYER_ID = '66666666-6666-4666-8666-666666666666'

interface BucketRow {
  min_score: number
  count: string
}

interface DbOptions {
  playerExists?: boolean
  playerScore?: number | null
  totalPlayers?: number
  averageScore?: string | null
  medianScore?: number | null
  topOneThreshold?: number | null
  buckets?: BucketRow[]
  rank?: number | null
  familyIndex?: number | null
}

function setupDb(opts: DbOptions = {}) {
  const {
    playerExists = true,
    playerScore = null,
    totalPlayers = 0,
    averageScore = '0',
    medianScore = 0,
    topOneThreshold = 100,
    buckets = [],
    rank = null,
    familyIndex = 1
  } = opts

  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('SELECT id FROM players')) {
      return Promise.resolve({
        rows: playerExists ? [{ id: PLAYER_ID }] : []
      })
    }

    if (sql.includes('player_id = $1') && sql.includes('normalized_score')) {
      return Promise.resolve({
        rows: playerScore === null ? [] : [{ normalized_score: playerScore }]
      })
    }

    if (sql.includes('COUNT(*) AS total')) {
      return Promise.resolve({
        rows: [
          {
            total: String(totalPlayers),
            avg_score: averageScore,
            median_score: medianScore,
            top1_threshold: topOneThreshold
          }
        ]
      })
    }

    if (sql.includes('AS min_score')) {
      return Promise.resolve({ rows: buckets })
    }

    if (sql.includes('AS rank')) {
      return Promise.resolve({
        rows: rank === null ? [] : [{ rank: String(rank) }]
      })
    }

    if (sql.includes('family_index FROM daily_puzzles')) {
      return Promise.resolve({
        rows: familyIndex === null ? [] : [{ family_index: familyIndex }]
      })
    }

    return Promise.resolve({ rows: [] })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
})

describe('getYesterdayReview', () => {
  it('rejects invalid input', async () => {
    setupDb()
    const res = await getYesterdayReview('bad-id', 'recall')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid input')
  })

  it('rejects unknown players', async () => {
    setupDb({ playerExists: false })
    const res = await getYesterdayReview(PLAYER_ID, 'recall')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Player not found')
  })

  it('errors when there are no community results for yesterday', async () => {
    setupDb({ totalPlayers: 0 })
    const res = await getYesterdayReview(PLAYER_ID, 'recall')
    expect(res.success).toBe(false)
    expect(res.error).toContain('No results')
  })

  it('returns null player fields when the player did not play', async () => {
    setupDb({
      totalPlayers: 10,
      buckets: [{ min_score: 90, count: '10' }]
    })

    const res = await getYesterdayReview(PLAYER_ID, 'recall')

    expect(res.success).toBe(true)
    expect(res.playerScore).toBeNull()
    expect(res.playerRank).toBeNull()
    expect(res.playerPercentile).toBeNull()
    expect(res.scoreBuckets).toHaveLength(5)
  })

  it('calculates bucket percentages from count rows', async () => {
    setupDb({
      totalPlayers: 100,
      playerScore: 85,
      rank: 15,
      buckets: [
        { min_score: 90, count: '15' },
        { min_score: 70, count: '25' },
        { min_score: 50, count: '30' },
        { min_score: 30, count: '20' },
        { min_score: 0, count: '10' }
      ]
    })

    const res = await getYesterdayReview(PLAYER_ID, 'recall')

    expect(res.success).toBe(true)
    expect(res.scoreBuckets).toHaveLength(5)

    const totalPct = res.scoreBuckets!.reduce(
      (sum, bucket) => sum + bucket.pct,
      0
    )
    expect(totalPct).toBe(100)

    const topBucket = res.scoreBuckets!.find((bucket) => bucket.minScore === 90)
    expect(topBucket?.count).toBe(15)
    expect(topBucket?.pct).toBe(15)
  })

  it('calculates player top percentile from rank', async () => {
    setupDb({
      totalPlayers: 200,
      playerScore: 90,
      rank: 20,
      buckets: [{ min_score: 90, count: '20' }]
    })

    const res = await getYesterdayReview(PLAYER_ID, 'recall')

    expect(res.success).toBe(true)
    expect(res.playerRank).toBe(20)
    expect(res.playerPercentile).toBe(10)
  })

  it('reports last place as 100% top percentile', async () => {
    setupDb({
      totalPlayers: 100,
      playerScore: 5,
      rank: 100,
      buckets: [{ min_score: 0, count: '100' }]
    })

    const res = await getYesterdayReview(PLAYER_ID, 'recall')

    expect(res.success).toBe(true)
    expect(res.playerRank).toBe(100)
    expect(res.playerPercentile).toBe(100)
  })

  it('releases the database client', async () => {
    setupDb({ totalPlayers: 0 })
    await getYesterdayReview(PLAYER_ID, 'recall')
    expect(mockRelease).toHaveBeenCalled()
  })
})
