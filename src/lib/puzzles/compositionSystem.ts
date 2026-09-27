// Compositional variation system. Axis type unions and their full value
// sets are defined here as typed const arrays so the seeded picker can
// select from them by index without hardcoding strings.

import type {
  ClueTypeId,
  MotionFunctionId,
  TimingProfileId
} from '@/types/puzzle'

// Deposit pattern templates for Crystal Mine (Depths)
export type DepositPatternId =
  | 'scattered'
  | 'clustered'
  | 'diagonal_line'
  | 'edges_only'
  | 'center_mass'
  | 'corners'
  | 'l_shape'
  | 'split'

export const DEPOSIT_PATTERNS: DepositPatternId[] = [
  'scattered',
  'clustered',
  'diagonal_line',
  'edges_only',
  'center_mass',
  'corners',
  'l_shape',
  'split'
]

// Surge play area dimensions (logical units, scaled to viewport)
export const SURGE_PLAY_WIDTH = 600
export const SURGE_PLAY_HEIGHT = 400

// Surge timing constants
export const SURGE_BASE_NODE_LIFETIME_MS = 1500
export const SURGE_SESSION_DURATION_MS = 60_000
export const SURGE_MAX_SIMULTANEOUS_NODES = 6
export const SURGE_NODE_HIT_RADIUS_PX = 48
export const SURGE_BURST_STAGGER_MS = 300
export const SURGE_BURST_LIFETIME_BONUS = 0.35
export const SURGE_MAX_BURST_LIFETIME_SCALE = 2.2
export const SURGE_MIN_SPAWN_MARGIN_MS = 800

// Strike track width (logical units)
export const STRIKE_TRACK_WIDTH = 600

// Recall glyph pool (all 16 symbols in order)
export const RECALL_GLYPHS = [
  '\u25C6', // filled diamond
  '\u25B2', // filled triangle up
  '\u25CF', // filled circle
  '\u25A0', // filled square
  '\u2605', // filled star
  '\u25C7', // hollow diamond
  '\u25BC', // filled triangle down
  '\u25CB', // hollow circle
  '\u2B21', // hollow hexagon
  '\u2726', // four-pointed star
  '\u2B22', // filled hexagon
  '\u25B3', // hollow triangle up
  '\u25C8', // compound diamond
  '\u2295', // circled plus
  '\u25A3', // square with inner square
  '\u2727' // hollow four-pointed star
] as const

// Charge limit formula for Crystal Mine
export function calcChargeLimit(
  gridSize: number,
  depositCount: number,
  clueType: ClueTypeId
): number {
  const clueTypePenalty: Record<ClueTypeId, number> = {
    numeric: 0,
    directional: 2,
    adjacency_count: 1,
    hot_cold: 3
  }
  return (
    depositCount +
    clueTypePenalty[clueType] +
    Math.floor(gridSize * gridSize * 0.08)
  )
}

// Clue tile count for Crystal Mine
export function calcClueTileCount(
  gridSize: number,
  depositCount: number
): number {
  return gridSize + depositCount
}

// Manhattan distance between two grid positions
export function manhattan(
  r1: number,
  c1: number,
  r2: number,
  c2: number
): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2)
}

// Returns the clue value for a clue tile at (row, col) given deposit positions
export function computeClueValue(
  row: number,
  col: number,
  deposits: { row: number; col: number }[],
  clueType: ClueTypeId,
  gridSize: number
): string | number {
  switch (clueType) {
    case 'numeric': {
      const minDist = Math.min(
        ...deposits.map((d) => manhattan(row, col, d.row, d.col))
      )
      return minDist
    }
    case 'directional': {
      const sorted = [...deposits].sort((a, b) => {
        const da = manhattan(row, col, a.row, a.col)
        const db = manhattan(row, col, b.row, b.col)
        if (da !== db) return da - db
        if (a.col !== b.col) return a.col - b.col
        return a.row - b.row
      })
      const nearest = sorted[0]
      if (!nearest) return '?'
      const dr = nearest.row - row
      const dc = nearest.col - col
      if (dr === 0 && dc === 0) return '\u25C6'
      const angle = Math.atan2(dr, dc) * (180 / Math.PI)
      if (angle >= -22.5 && angle < 22.5) return '\u2192'
      if (angle >= 22.5 && angle < 67.5) return '\u2198'
      if (angle >= 67.5 && angle < 112.5) return '\u2193'
      if (angle >= 112.5 && angle < 157.5) return '\u2199'
      if (angle >= 157.5 || angle < -157.5) return '\u2190'
      if (angle >= -157.5 && angle < -112.5) return '\u2196'
      if (angle >= -112.5 && angle < -67.5) return '\u2191'
      return '\u2197'
    }
    case 'hot_cold': {
      const minDist = Math.min(
        ...deposits.map((d) => manhattan(row, col, d.row, d.col))
      )
      if (minDist <= 1) return 'HOT'
      if (minDist <= 3) return 'WARM'
      return 'COLD'
    }
    case 'adjacency_count': {
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = row + dr
          const nc = col + dc
          if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
            if (deposits.some((d) => d.row === nr && d.col === nc)) count++
          }
        }
      }
      return count
    }
  }
}

// Spawn interval at time t (ms) for each Surge timing profile
export function calcSpawnInterval(
  profile: TimingProfileId,
  tMs: number,
  seededJitter: number // 0-1 seeded float for the 'mixed' profile segment pick
): number {
  const t = tMs / 1000
  switch (profile) {
    case 'ramp': {
      // Linear decrease 520 -> 240 over 60s
      const progress = Math.min(1, t / 60)
      return 520 - progress * 280
    }
    case 'sudden_spike':
      return t < 36 ? 420 : 220
    case 'wave':
      return 360 + 140 * Math.sin((2 * Math.PI * t) / 15)
    case 'endurance':
      return 320
    case 'pressure':
      return 260
    case 'mixed': {
      // 15-second segments with seeded interval pick
      const segmentIndex = Math.floor(t / 15)
      const options = [250, 340, 440]
      return (
        options[Math.floor(seededJitter * options.length) % options.length] ??
        340
      )
    }
    case 'slow_short':
      return 420
    case 'fast_long':
      return 320
    default:
      return 320
  }
}

// Session duration override for timing profiles that change the 60s default
export function getSessionDurationMs(profile: TimingProfileId): number {
  if (profile === 'slow_short') return 45_000
  if (profile === 'fast_long') return 90_000
  return SURGE_SESSION_DURATION_MS
}

// Reticle x-position at time t for Strike motion functions
export function calcReticleX(
  fn: MotionFunctionId,
  tSec: number,
  speedMultiplier: number,
  freqHz: number // seeded 0.3-0.8 for sinusoidal
): number {
  const v = speedMultiplier * 200
  switch (fn) {
    case 'linear': {
      // Bounce at 0 and STRIKE_TRACK_WIDTH
      const period = (STRIKE_TRACK_WIDTH * 2) / v
      const pos = (tSec % period) * v
      return pos <= STRIKE_TRACK_WIDTH ? pos : STRIKE_TRACK_WIDTH * 2 - pos
    }
    case 'sinusoidal':
      return 300 + 250 * Math.sin(2 * Math.PI * freqHz * tSec * speedMultiplier)
    case 'erratic': {
      const base = calcReticleX('linear', tSec, speedMultiplier, freqHz)
      return Math.min(
        STRIKE_TRACK_WIDTH,
        Math.max(
          0,
          base + 10 * Math.sin(7.3 * tSec) + 6 * Math.sin(13.1 * tSec)
        )
      )
    }
    case 'pendulum': {
      // Harmonic gravity oscillation: sweeps entire track width, whipping fast through the center
      const omega = (speedMultiplier * 200) / 260
      const theta = omega * tSec
      return 300 - 260 * Math.cos(theta)
    }
    case 'staccato': {
      // Stepper motor pulse: rapid 250ms bursts followed by 150ms stutter-pauses
      const cyclePeriod = 0.4
      const scaledT = tSec * speedMultiplier
      const cycleT = scaledT % cyclePeriod
      const stepIndex = Math.floor(scaledT / cyclePeriod)
      const stepDistance = 45
      const burstFraction = Math.min(1.0, cycleT / 0.25)
      const totalTraveled = (stepIndex + burstFraction) * stepDistance
      const trackSpan = STRIKE_TRACK_WIDTH * 2
      const pos = totalTraveled % trackSpan
      return pos <= STRIKE_TRACK_WIDTH ? pos : trackSpan - pos
    }
    case 'deceptive': {
      // Deceptive movement is handled per-shot in Strike component.
      // Use linear movement during the base phase.
      return calcReticleX('linear', tSec, speedMultiplier, freqHz)
    }
    default:
      return calcReticleX('linear', tSec, speedMultiplier, freqHz)
  }
}
