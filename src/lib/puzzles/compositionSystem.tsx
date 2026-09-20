// Compositional variation system. Axis type unions and their full value
// sets are defined here as typed const arrays so the seeded picker can
// select from them by index without hardcoding strings.

import type {
  SpawnPatternId,
  TargetBehaviorId,
  TimingProfileId,
  SpatialLayoutId,
  MotionFunctionId,
  PatternGeneratorId,
  ClueTypeId
} from '@/types/puzzle'

export const SPAWN_PATTERNS: SpawnPatternId[] = [
  'single',
  'alternating',
  'h_sweep',
  'v_sweep',
  'diagonal',
  'zigzag',
  'scatter',
  'circular',
  'expanding',
  'contracting',
  'corner_seq',
  'center_out',
  'outside_in',
  'paired',
  'triple_burst',
  'cross',
  'wave',
  'spiral',
  'lane_switch'
]

export const TARGET_BEHAVIORS: TargetBehaviorId[] = [
  'stationary',
  'moving',
  'accelerating',
  'decelerating',
  'direction_change',
  'brief',
  'growing',
  'shrinking',
  'fading',
  'splitting'
]

export const TIMING_PROFILES: TimingProfileId[] = [
  'ramp',
  'sudden_spike',
  'wave',
  'endurance',
  'pressure',
  'mixed',
  'slow_short',
  'fast_long'
]

export const SPATIAL_LAYOUTS: SpatialLayoutId[] = [
  'lr_lanes',
  'tb_lanes',
  'corners',
  'center',
  'circular_perimeter',
  'grid',
  'random',
  'symmetrical',
  'asymmetrical',
  'narrow_corridor'
]

export const MOTION_FUNCTIONS: MotionFunctionId[] = [
  'linear',
  'sinusoidal',
  'erratic',
  'deceptive'
]

export const PATTERN_GENERATORS: PatternGeneratorId[] = [
  'alternating',
  'rotation_mirror',
  'dual_variable',
  'tri_variable',
  'rule_discovery',
  'grid_transform',
  'constrained_choice'
]

export const CLUE_TYPES: ClueTypeId[] = [
  'numeric',
  'directional',
  'hot_cold',
  'adjacency_count'
]

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
export const SURGE_BASE_SPAWN_INTERVAL_MS = 800
export const SURGE_SESSION_DURATION_MS = 90_000
export const SURGE_MAX_SIMULTANEOUS_NODES = 4
export const SURGE_NODE_HIT_RADIUS_PX = 48

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
    directional: 1,
    adjacency_count: 1,
    hot_cold: 2
  }
  return (
    depositCount +
    clueTypePenalty[clueType] +
    Math.floor(gridSize * gridSize * 0.12)
  )
}

// Clue tile count for Crystal Mine
export function calcClueTileCount(
  gridSize: number,
  depositCount: number
): number {
  return gridSize + depositCount
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
      // Linear decrease 800 -> 300 over 90s
      const progress = Math.min(1, t / 90)
      return 800 - progress * 500
    }
    case 'sudden_spike':
      return t < 54 ? 700 : 200
    case 'wave':
      return 600 + 200 * Math.sin((2 * Math.PI * t) / 15)
    case 'endurance':
      return 500
    case 'pressure':
      return 300
    case 'mixed': {
      // 15-second segments with seeded interval pick
      const segmentIndex = Math.floor(t / 15)
      const options = [300, 500, 700]
      return (
        options[Math.floor(seededJitter * options.length) % options.length] ??
        500
      )
    }
    case 'slow_short':
      return 800
    case 'fast_long':
      return 400
    default:
      return 500
  }
}

// Session duration override for timing profiles that change the 90s default
export function getSessionDurationMs(profile: TimingProfileId): number {
  if (profile === 'slow_short') return 60_000
  if (profile === 'fast_long') return 120_000
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
          base + 40 * Math.sin(7.3 * tSec) + 25 * Math.sin(13.1 * tSec)
        )
      )
    }
    case 'deceptive': {
      // Simplified: linear until 60px before target center, then deceptive sequence.
      // Full deceptive logic is driven per-shot in the Strike component; here
      // we return the base linear position used for non-deceptive phases.
      return calcReticleX('linear', tSec, speedMultiplier, freqHz)
    }
    default:
      return calcReticleX('linear', tSec, speedMultiplier, freqHz)
  }
}
