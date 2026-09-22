import 'server-only'

import { nextInt, nextFloat } from '@/lib/puzzles/seededRandom'
import { STRIKE_BASE_CONFIGS } from '@/lib/puzzles/baseConfigs/strike'
import {
  STRIKE_TRACK_WIDTH,
} from '@/lib/puzzles/compositionSystem'
import { registerValidator } from '@/lib/puzzles/validateChallenge'
import type {
  PuzzleFamilyDefinition,
  PuzzleSeedData,
  ResultMetricDefinition
} from '@/types/puzzle'
import type { MotionFunctionId } from '@/types/puzzle'
import { seedToRng } from '../generateChallenge'

export interface SniperShot {
  targetCenterX: number // logical px 0-600
  targetWindowPx: number
  freqHz: number // for sinusoidal motion
}

export interface SniperChallengeData {
  shots: SniperShot[]
  shotCount: number
  movementSpeed: number
  motionFunction: MotionFunctionId
  targetWindowPx: number
  timingWindowMs: number
}

function generate(seed: string): PuzzleSeedData {
  const rng = seedToRng(seed)
  const base = STRIKE_BASE_CONFIGS[nextInt(rng, STRIKE_BASE_CONFIGS.length)]

  // Continuous variation on speed (+-8%) and window (+-10%)
  // Tighter speed variance avoids the hardest base configs becoming
  // effectively unplayable on mobile at 2.8x+ speed
  const speedVariance = nextFloat(rng, 0.92, 1.08)
  const windowVariance = nextFloat(rng, 0.9, 1.1)
  const movementSpeed = Math.round(base.movementSpeed * speedVariance * 10) / 10
  const targetWindowPx = Math.max(
    12,
    Math.round(base.targetWindowPx * windowVariance)
  )

  // Pre-generate per-shot target positions and sinusoidal frequencies
  const shots: SniperShot[] = []
  for (let i = 0; i < base.shotCount; i++) {
    // Target center avoids outer 50px of each edge per spec
    const targetCenterX = nextFloat(rng, 50, STRIKE_TRACK_WIDTH - 50)
    const freqHz = nextFloat(rng, 0.3, 0.8)
    shots.push({ targetCenterX, targetWindowPx, freqHz })
  }

  const familyData: SniperChallengeData = {
    shots,
    shotCount: base.shotCount,
    movementSpeed,
    motionFunction: base.motionFunction,
    targetWindowPx,
    timingWindowMs: base.timingWindowMs
  }

  return {
    profile: {
      shotCount: base.shotCount,
      movementSpeed,
      motionFunction: base.motionFunction,
      targetWindowPx
    },
    familyData: familyData as unknown as Record<string, unknown>
  }
}

const RESULT_METRICS: ResultMetricDefinition[] = [
  { key: 'perfectHits', label: 'Perfect Hits', format: 'integer' },
  { key: 'excellentHits', label: 'Excellent Hits', format: 'integer' },
  { key: 'accuracyPct', label: 'Accuracy', format: 'percent' },
  { key: 'avgDeviation', label: 'Avg Deviation', format: 'integer' },
  { key: 'totalShots', label: 'Total Shots', format: 'integer' }
]

export const SniperChallengeFamily: PuzzleFamilyDefinition = {
  id: 'sniper_challenge',
  displayName: 'Sniper Challenge',
  category: 'strike',
  generate,
  resultMetrics: RESULT_METRICS,
  scoringModel: 'speed-first'
}

registerValidator('sniper_challenge', (data) => {
  const fam = data.familyData as unknown as SniperChallengeData
  if (fam.shotCount < 5) {
    return { valid: false, reason: 'Too few shots' }
  }
  if (fam.targetWindowPx < 12) {
    return {
      valid: false,
      reason: 'Target window too narrow for reliable mobile play'
    }
  }
  // Reject deceptive + very high speed (2.5x+) on narrow windows (<25px):
  // the fake-out at high speed with a small target creates a near-zero skill floor
  if (
    fam.motionFunction === 'deceptive' &&
    fam.movementSpeed >= 2.5 &&
    fam.targetWindowPx < 25
  ) {
    return {
      valid: false,
      reason: 'Deceptive motion at high speed with narrow window is not fair'
    }
  }
  return { valid: true }
})