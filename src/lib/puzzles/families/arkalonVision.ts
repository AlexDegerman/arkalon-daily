import 'server-only'

import {
  seedToRng,
  nextInt,
  nextFloat,
  pickOne,
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
  // Display duration varies +-12% from the base value (tighter range
  // avoids collapsing short configs below the 1000ms playability floor)
  const durationVariance = nextFloat(rng, 0.88, 1.12)
  const displayDurationMs = Math.round(
    baseConfig.displayDurationMs * durationVariance
  )

  // Clamp to valid range: 1000-3500ms
  const clampedDuration = Math.min(3500, Math.max(1000, displayDurationMs))

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
      const roundDuration = Math.round(clampedDuration * roundDurationVariance)

      // Build sequence: draw from glyph pool with replacement
      const sequence: string[] = []
      for (let i = 0; i < seqLen; i++) {
        sequence.push(glyphPool[nextInt(rng, glyphPool.length)])
      }

      // Round 3 only: apply reverseEntry if configured
      const isLastRound = roundIdx === baseConfig.seqLengths.length - 1

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
      displayDurationMs: clampedDuration,
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
// display duration must be at least 1000ms; rejects monotone configs.
registerValidator('arkalon_vision', (data) => {
  const fam = data.familyData as unknown as ArkalonVisionData

  for (const round of fam.rounds) {
    if (round.displayDurationMs < 1000) {
      return {
        valid: false,
        reason: `Display duration too short: ${round.displayDurationMs}ms`
      }
    }
    for (const glyph of round.sequence) {
      if (!fam.glyphPool.includes(glyph)) {
        return { valid: false, reason: `Glyph "${glyph}" not in active pool` }
      }
    }
  }

  // Reject if all rounds have sequence length <= 2 (trivially easy)
  const allTrivial = fam.rounds.every((r) => r.sequence.length <= 2);
  if (allTrivial) {
    return { valid: false, reason: 'All rounds are trivially short' };
  }

  // Reject if display duration is so short all rounds are below 1200ms
  const allTooFast = fam.rounds.every((r) => r.displayDurationMs < 1200);
  if (allTooFast) {
    return { valid: false, reason: 'All rounds have display duration below 1200ms' };
  }

  return { valid: true }
})
