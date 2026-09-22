import {
  SCORE_TIER_THRESHOLDS,
  RARITY_SCORE_THRESHOLDS
} from '@/constants/tiers'

// Maps score values to their tier CSS class
export function getScoreTierClass(score: number): string {
  for (const { min, cls } of SCORE_TIER_THRESHOLDS) {
    if (score >= min) return cls
  }
  return 'g-vg' // Fallback to the lowest mapped tier
}

const SCORE_TIER_SOLID_COLORS: { min: number; color: string }[] = [
  { min: 100, color: '#ffd700' },
  { min: 96, color: '#fbbf24' },
  { min: 90, color: '#ec4899' },
  { min: 85, color: '#cceeff' },
  { min: 80, color: '#a855f7' },
  { min: 70, color: '#f59e0b' },
  { min: 60, color: '#5bc0be' },
  { min: 50, color: '#7dd3fc' },
  { min: 40, color: '#0ea5e9' },
  { min: 30, color: '#4ade80' },
  { min: 15, color: '#4682b4' },
  { min: 0, color: '#94a3b8' }
]

// html2canvas cannot paint background-clip: text or transparent fills,
// so the share card renders the score as a solid tier-matched color.
export function getScoreTierSolidColor(score: number): string {
  for (const { min, color } of SCORE_TIER_SOLID_COLORS) {
    if (score >= min) return color
  }
  return '#10b981'
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
