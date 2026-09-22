import 'server-only'

import {
  nextInt,
  nextFloat,
  shuffle
} from '@/lib/puzzles/seededRandom'
import { RECALL_GLYPHS } from '@/lib/puzzles/compositionSystem'
import { RECALL_BASE_CONFIGS } from '@/lib/puzzles/baseConfigs/recall'
import { registerValidator } from '@/lib/puzzles/validateChallenge'
import type {
  PuzzleFamilyDefinition,
  PuzzleSeedData,
  ResultMetricDefinition
} from '@/types/puzzle'
import { seedToRng } from '../generateChallenge'

// Resolved data produced by the generator and consumed by ArkalonVision component
export interface ArkalonVisionData {
  rounds: ArkalonVisionRound[]
  glyphPool: string[] // active subset of RECALL_GLYPHS
  randomizedLayout: boolean
  reverseEntry: boolean
}

export interface ArkalonVisionRound {
  sequence: string[] // glyphs to display and reproduce
  displayDurationMs: number
  keypadOrder: string[] // order glyphs appear on keypad (shuffled if randomizedLayout)
}

function generate(seed: string): PuzzleSeedData {
  const rng = seedToRng(seed)
  // Pick base config by seeded index
  const baseConfig =
    RECALL_BASE_CONFIGS[nextInt(rng, RECALL_BASE_CONFIGS.length)]

  // Continuous-parameter variation on top of the base config
  // Per-glyph display duration varies +-12% from the base value (tighter range
  // avoids collapsing short configs below the 450ms per-glyph playability floor)
  const durationVariance = nextFloat(rng, 0.88, 1.12)
  const basePerGlyph = Math.round(baseConfig.perGlyphMs * durationVariance)

  // Clamp to valid range: 500-1000ms per glyph
  const clampedPerGlyph = Math.min(1000, Math.max(500, basePerGlyph))

  // Select active glyph pool (contiguous from index 0 per spec)
  const glyphPool = Array.from(RECALL_GLYPHS).slice(0, baseConfig.glyphPool)

  // Build keypad order: same glyphs, shuffled if randomizedLayout
  const baseKeypadOrder = [...glyphPool]
  const keypadOrder = baseConfig.randomizedLayout
    ? shuffle(rng, baseKeypadOrder)
    : baseKeypadOrder

  // Generate rounds
  const rounds: ArkalonVisionRound[] = baseConfig.seqLengths.map(
    (seqLen, roundIdx) => {
      // Each round has a slight duration variation for engagement
      const roundDurationVariance = nextFloat(rng, 0.92, 1.08)
      // Round total scales with sequence length so per-glyph time stays constant
      const roundDuration = Math.round(
        clampedPerGlyph * seqLen * roundDurationVariance
      )

      // Build sequence: draw from glyph pool with replacement
      const sequence: string[] = []
      for (let i = 0; i < seqLen; i++) {
        sequence.push(glyphPool[nextInt(rng, glyphPool.length)])
      }

      // Randomized keypad shuffles per-round when enabled
      const roundKeypadOrder = baseConfig.randomizedLayout
        ? shuffle(rng, [...glyphPool])
        : keypadOrder

      return {
        sequence,
        displayDurationMs: roundDuration,
        keypadOrder: roundKeypadOrder
      }
    }
  )

  const familyData: ArkalonVisionData = {
    rounds,
    glyphPool,
    randomizedLayout: baseConfig.randomizedLayout,
    reverseEntry: baseConfig.reverseEntry
  }

  return {
    profile: {
      sequenceLength: baseConfig.seqLengths[baseConfig.seqLengths.length - 1],
      // Per-glyph duration; round totals live in familyData.rounds
      displayDurationMs: clampedPerGlyph,
      glyphPool: baseConfig.glyphPool,
      randomizedLayout: baseConfig.randomizedLayout,
      reverseEntry: baseConfig.reverseEntry,
      roundCount: 3
    },
    familyData: familyData as unknown as Record<string, unknown>
  }
}

const RESULT_METRICS: ResultMetricDefinition[] = [
  { key: 'accuracyPercent', label: 'Accuracy', format: 'percent' },
  { key: 'maxSequence', label: 'Max Sequence', format: 'integer' },
  { key: 'errors', label: 'Errors', format: 'integer' },
  { key: 'completionTimeMs', label: 'Completion Time', format: 'time' }
]

export const ArkalonVisionFamily: PuzzleFamilyDefinition = {
  id: 'arkalon_vision',
  displayName: 'Arkalon Vision',
  category: 'recall',
  generate,
  resultMetrics: RESULT_METRICS,
  scoringModel: 'continuous'
}

// Validator: sequence length must not exceed glyph pool size;
// per-glyph display duration must be at least 450ms; rejects monotone configs.
registerValidator('arkalon_vision', (data) => {
  const fam = data.familyData as unknown as ArkalonVisionData
  // profile.displayDurationMs carries the clamped per-glyph duration
  const profilePerGlyphMs = data.profile.displayDurationMs ?? 0
  if (profilePerGlyphMs < 500) {
    return {
      valid: false,
      reason: `Per-glyph display duration too short: ${profilePerGlyphMs}ms`
    }
  }
  for (const round of fam.rounds) {
    // Hard floor: no round may dip below 450ms per glyph after engagement variance
    const perGlyphMs = round.displayDurationMs / round.sequence.length
    if (perGlyphMs < 450) {
      return {
        valid: false,
        reason: `Per-glyph display duration too short: ${Math.round(perGlyphMs)}ms`
      }
    }
    for (const glyph of round.sequence) {
      if (!fam.glyphPool.includes(glyph)) {
        return { valid: false, reason: `Glyph "${glyph}" not in active pool` }
      }
    }
  }
  return { valid: true }
})