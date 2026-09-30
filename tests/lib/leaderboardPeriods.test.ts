import { describe, it, expect } from 'vitest'
import {
  PERIOD_LABELS,
  LEADERBOARD_THRESHOLDS,
  getIsoWeekStartUtc,
  addDaysUtc
} from '@/lib/leaderboardPeriods'

describe('PERIOD_LABELS', () => {
  it('contains labels for all three periods', () => {
    expect(PERIOD_LABELS.daily).toBe('Daily')
    expect(PERIOD_LABELS.weekly).toBe('Weekly')
    expect(PERIOD_LABELS.alltime).toBe('All Time')
  })
})

describe('LEADERBOARD_THRESHOLDS', () => {
  it('defines minimum attempt thresholds for all periods and scopes', () => {
    expect(LEADERBOARD_THRESHOLDS.daily.category).toBe(1)
    expect(LEADERBOARD_THRESHOLDS.daily.total).toBe(1)
    expect(LEADERBOARD_THRESHOLDS.weekly.category).toBe(1)
    expect(LEADERBOARD_THRESHOLDS.weekly.total).toBe(1)
    expect(LEADERBOARD_THRESHOLDS.alltime.category).toBe(1)
    expect(LEADERBOARD_THRESHOLDS.alltime.total).toBe(1)
  })
})

describe('getIsoWeekStartUtc', () => {
  it('returns the Monday of the ISO week containing the date', () => {
    // Wednesday 2026-09-23 -> Monday 2026-09-21
    const date = new Date('2026-09-23T12:00:00Z')
    expect(getIsoWeekStartUtc(date)).toBe('2026-09-21')
  })

  it('returns the same date if it is already a Monday', () => {
    const date = new Date('2026-09-21T00:00:00Z')
    expect(getIsoWeekStartUtc(date)).toBe('2026-09-21')
  })

  it('handles Sunday correctly (rolls back to previous Monday)', () => {
    // Sunday 2026-09-27 -> Monday 2026-09-21
    const date = new Date('2026-09-27T23:59:59Z')
    expect(getIsoWeekStartUtc(date)).toBe('2026-09-21')
  })

  it('defaults to current date when no argument is passed', () => {
    const result = getIsoWeekStartUtc()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('addDaysUtc', () => {
  it('adds positive days', () => {
    expect(addDaysUtc('2026-09-21', 6)).toBe('2026-09-27')
  })

  it('adds negative days', () => {
    expect(addDaysUtc('2026-09-21', -1)).toBe('2026-09-20')
  })

  it('handles month boundaries correctly', () => {
    expect(addDaysUtc('2026-09-30', 1)).toBe('2026-10-01')
  })
})
