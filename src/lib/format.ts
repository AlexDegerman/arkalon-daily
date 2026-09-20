import {
  SCORE_TIER_THRESHOLDS,
  RARITY_SCORE_THRESHOLDS
} from '@/constants/tiers'

// Maps score values to their tier CSS class
export function getScoreTierClass(score: number): string {
  for (const { min, cls } of SCORE_TIER_THRESHOLDS) {
    if (score >= min) return cls
  }
  return 'g-m1' // Fallback to Million/Micro tier styling
}

// Maps a 0-100 score to its rarity string for result frame and badge styling.
export function getScoreRarity(score: number): string {
  for (const { min, rarity } of RARITY_SCORE_THRESHOLDS) {
    if (score >= min) return rarity
  }
  return 'common'
}

// Formats a timestamp for display (e.g. result screen, profile page).
export function formatDateTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Formats elapsed milliseconds as a human-readable duration string.
export function formatElapsedMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }

  // Display sub-second precision when under one minute
  const tenths = Math.floor((ms % 1000) / 100)
  return `${seconds}.${tenths}s`
}
