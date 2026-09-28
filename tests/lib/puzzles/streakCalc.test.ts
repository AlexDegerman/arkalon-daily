import { describe, it, expect, vi } from 'vitest'
import type { PoolClient } from 'pg'
import { recomputeStreak } from '@/lib/puzzles/streakCalc'

function daysAgo(n: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function makeClient(
  results: Array<{ puzzle_date: string; normalized_score: number }>,
  longestStreak: number | null = 0
) {
  return {
    query: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('daily_results')) {
        return Promise.resolve({ rows: results })
      }
      if (sql.includes('category_streaks')) {
        const rows =
          longestStreak === null ? [] : [{ longest_streak: longestStreak }]
        return Promise.resolve({ rows })
      }
      return Promise.resolve({ rows: [] })
    })
  } as unknown as PoolClient
}

describe('recomputeStreak', () => {
  it('returns zero streak when there are no results', async () => {
    const client = makeClient([], 0)
    const result = await recomputeStreak(client, 'player-1', 'recall')
    expect(result).toEqual({ currentStreak: 0, longestStreak: 0 })
  })

  it('counts consecutive qualifying days ending today', async () => {
    const results = [
      { puzzle_date: daysAgo(0), normalized_score: 80 },
      { puzzle_date: daysAgo(1), normalized_score: 60 },
      { puzzle_date: daysAgo(2), normalized_score: 45 }
    ]
    const client = makeClient(results, 0)
    const result = await recomputeStreak(client, 'player-1', 'recall')
    expect(result.currentStreak).toBe(3)
  })

  it('stops counting at a missing day', async () => {
    const results = [
      { puzzle_date: daysAgo(0), normalized_score: 80 },
      { puzzle_date: daysAgo(1), normalized_score: 60 },
      { puzzle_date: daysAgo(3), normalized_score: 90 }
    ]
    const client = makeClient(results, 0)
    const result = await recomputeStreak(client, 'player-1', 'recall')
    expect(result.currentStreak).toBe(2)
  })

  it('stops counting at a score below the minimum', async () => {
    const results = [
      { puzzle_date: daysAgo(0), normalized_score: 80 },
      { puzzle_date: daysAgo(1), normalized_score: 10 },
      { puzzle_date: daysAgo(2), normalized_score: 90 }
    ]
    const client = makeClient(results, 0)
    const result = await recomputeStreak(client, 'player-1', 'recall')
    expect(result.currentStreak).toBe(1)
  })

  it('returns zero current streak when today has no qualifying result', async () => {
    const results = [
      { puzzle_date: daysAgo(1), normalized_score: 80 },
      { puzzle_date: daysAgo(2), normalized_score: 60 }
    ]
    const client = makeClient(results, 0)
    const result = await recomputeStreak(client, 'player-1', 'recall')
    expect(result.currentStreak).toBe(0)
  })

  it('preserves the longer stored longest streak', async () => {
    const results = [
      { puzzle_date: daysAgo(0), normalized_score: 80 },
      { puzzle_date: daysAgo(1), normalized_score: 60 }
    ]
    const client = makeClient(results, 5)
    const result = await recomputeStreak(client, 'player-1', 'recall')
    expect(result.currentStreak).toBe(2)
    expect(result.longestStreak).toBe(5)
  })

  it('updates longest streak when the current streak exceeds it', async () => {
    const results = [
      { puzzle_date: daysAgo(0), normalized_score: 80 },
      { puzzle_date: daysAgo(1), normalized_score: 60 },
      { puzzle_date: daysAgo(2), normalized_score: 70 },
      { puzzle_date: daysAgo(3), normalized_score: 55 },
      { puzzle_date: daysAgo(4), normalized_score: 90 },
      { puzzle_date: daysAgo(5), normalized_score: 40 },
      { puzzle_date: daysAgo(6), normalized_score: 65 }
    ]
    const client = makeClient(results, 5)
    const result = await recomputeStreak(client, 'player-1', 'recall')
    expect(result.currentStreak).toBe(7)
    expect(result.longestStreak).toBe(7)
  })

  it('handles a missing category_streaks row as zero', async () => {
    const results = [
      { puzzle_date: daysAgo(0), normalized_score: 80 },
      { puzzle_date: daysAgo(1), normalized_score: 60 }
    ]
    const client = makeClient(results, null)
    const result = await recomputeStreak(client, 'player-1', 'recall')
    expect(result.currentStreak).toBe(2)
    expect(result.longestStreak).toBe(2)
  })
})
