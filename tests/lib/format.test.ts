import { describe, it, expect } from 'vitest'
import {
  getScoreTierClass,
  getScoreTierSolidColor,
  getScoreRarity,
  formatDateTime,
  formatElapsedMs
} from '@/lib/format'

describe('getScoreTierClass', () => {
  it('returns the correct CSS class for tier boundaries', () => {
    expect(getScoreTierClass(100)).toBe('g-tqgs')
    expect(getScoreTierClass(96)).toBe('g-ttr')
    expect(getScoreTierClass(90)).toBe('g-dqgs')
    expect(getScoreTierClass(85)).toBe('g-uvg')
    expect(getScoreTierClass(80)).toBe('g-str')
    expect(getScoreTierClass(70)).toBe('g-qntr')
    expect(getScoreTierClass(60)).toBe('g-nvg')
    expect(getScoreTierClass(50)).toBe('g-dc')
    expect(getScoreTierClass(40)).toBe('g-sp')
    expect(getScoreTierClass(30)).toBe('g-ntg')
    expect(getScoreTierClass(15)).toBe('g-qnqg')
    expect(getScoreTierClass(0)).toBe('g-vg')
  })

  it('falls back to the lowest tier for negative scores', () => {
    expect(getScoreTierClass(-10)).toBe('g-vg')
  })

  it('uses the higher tier when exactly on the boundary', () => {
    expect(getScoreTierClass(96)).toBe('g-ttr')
    expect(getScoreTierClass(95)).toBe('g-dqgs')
  })
})

describe('getScoreTierSolidColor', () => {
  it('returns hex colors for share card rendering', () => {
    expect(getScoreTierSolidColor(100)).toBe('#ffd700')
    expect(getScoreTierSolidColor(85)).toBe('#cceeff')
    expect(getScoreTierSolidColor(0)).toBe('#94a3b8')
  })

  it('falls back for out-of-bounds scores', () => {
    expect(getScoreTierSolidColor(-5)).toBe('#10b981')
  })
})

describe('getScoreRarity', () => {
  it('maps scores to rarity strings for frames and badges', () => {
    expect(getScoreRarity(100)).toBe('mythical')
    expect(getScoreRarity(96)).toBe('mythical')
    expect(getScoreRarity(95)).toBe('legendary')
    expect(getScoreRarity(85)).toBe('legendary')
    expect(getScoreRarity(84)).toBe('epic')
    expect(getScoreRarity(70)).toBe('epic')
    expect(getScoreRarity(69)).toBe('rare')
    expect(getScoreRarity(50)).toBe('rare')
    expect(getScoreRarity(49)).toBe('common')
    expect(getScoreRarity(0)).toBe('common')
  })
})

describe('formatDateTime', () => {
  it('formats ISO strings to en-GB short date', () => {
    const result = formatDateTime('2026-01-15T12:00:00Z')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2026/)
  })

  it('accepts Date objects', () => {
    const date = new Date('2026-06-01T00:00:00Z')
    const result = formatDateTime(date)
    expect(result).toMatch(/2026/)
  })
})

describe('formatElapsedMs', () => {
  it('formats sub-second times with tenths', () => {
    expect(formatElapsedMs(450)).toBe('0.4s')
    expect(formatElapsedMs(999)).toBe('0.9s')
  })

  it('formats seconds under a minute without minutes prefix', () => {
    expect(formatElapsedMs(5000)).toBe('5.0s')
    expect(formatElapsedMs(59999)).toBe('59.9s')
  })

  it('formats times over a minute with m and s', () => {
    expect(formatElapsedMs(60000)).toBe('1m 00s')
    expect(formatElapsedMs(125500)).toBe('2m 05s')
  })
})
