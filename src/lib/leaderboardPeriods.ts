import type { PuzzleCategory } from '@/types/puzzle'

export type LeaderboardPeriod = 'daily' | 'weekly' | 'alltime'
export type LeaderboardScope = PuzzleCategory | 'total'

export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  alltime: 'All Time'
}

// Minimum attempts to appear on the ranked board; the >=1 clear guard
// lives in the query HAVING clause.
export const LEADERBOARD_THRESHOLDS: Record<
  LeaderboardPeriod,
  Record<'category' | 'total', number>
> = {
  daily: { category: 1, total: 1 },
  weekly: { category: 3, total: 5 },
  alltime: { category: 10, total: 25 }
}

// Monday 00:00 UTC of the ISO week containing `date`.
export function getIsoWeekStartUtc(date: Date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  const daysSinceMonday = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - daysSinceMonday)
  return d.toISOString().slice(0, 10)
}

export function addDaysUtc(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
