import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { deriveDailySeed, getUtcDateString } from '@/lib/puzzles/hmac'

describe('deriveDailySeed', () => {
  const originalEnv = process.env.HMAC_SERVER_SECRET

  beforeEach(() => {
    process.env.HMAC_SERVER_SECRET = 'test_secret_key_123'
  })

  afterEach(() => {
    process.env.HMAC_SERVER_SECRET = originalEnv
  })

  it('derives a deterministic hex seed from date and category', () => {
    const seed1 = deriveDailySeed('2026-09-23', 'recall')
    const seed2 = deriveDailySeed('2026-09-23', 'recall')
    expect(seed1).toBe(seed2)
    expect(seed1).toMatch(/^[0-9a-f]+$/)
  })

  it('produces different seeds for different categories on the same date', () => {
    const seedRecall = deriveDailySeed('2026-09-23', 'recall')
    const seedSurge = deriveDailySeed('2026-09-23', 'surge')
    expect(seedRecall).not.toBe(seedSurge)
  })

  it('produces different seeds for different dates in the same category', () => {
    const seed1 = deriveDailySeed('2026-09-23', 'recall')
    const seed2 = deriveDailySeed('2026-09-24', 'recall')
    expect(seed1).not.toBe(seed2)
  })

  it('throws if HMAC_SERVER_SECRET is not set', () => {
    delete process.env.HMAC_SERVER_SECRET
    expect(() => deriveDailySeed('2026-09-23', 'recall')).toThrow(
      'HMAC_SERVER_SECRET is not set'
    )
  })
})

describe('getUtcDateString', () => {
  it('returns YYYY-MM-DD for a specific UTC date', () => {
    const date = new Date('2026-09-23T14:30:00Z')
    expect(getUtcDateString(date)).toBe('2026-09-23')
  })

  it('handles late-night UTC without rolling over to the next day', () => {
    const date = new Date('2026-09-23T23:59:59Z')
    expect(getUtcDateString(date)).toBe('2026-09-23')
  })

  it('defaults to current date when no argument is passed', () => {
    const result = getUtcDateString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
