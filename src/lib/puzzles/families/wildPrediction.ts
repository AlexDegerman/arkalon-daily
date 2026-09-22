import 'server-only'

import { nextInt } from '@/lib/puzzles/seededRandom'
import { CIPHER_BASE_CONFIGS } from '@/lib/puzzles/baseConfigs/cipher'
import { generateRound } from '@/lib/puzzles/patternGenerators'
import { registerValidator } from '@/lib/puzzles/validateChallenge'
import type {
  PuzzleFamilyDefinition,
  PuzzleSeedData,
  ResultMetricDefinition
} from '@/types/puzzle'
import type { CipherRound } from '@/lib/puzzles/patternGenerators'
import { seedToRng } from '../generateChallenge'

export interface WildPredictionData {
  rounds: CipherRound[]
  timerSeconds: number | null
  roundCount: number
}

function generate(seed: string): PuzzleSeedData {
  const rng = seedToRng(seed)
  const base = CIPHER_BASE_CONFIGS[nextInt(rng, CIPHER_BASE_CONFIGS.length)]

  const rounds: CipherRound[] = []
  for (let i = 0; i < base.roundCount; i++) {
    // Cycle through generators in order when multiple are listed
    const generator = base.generators[i % base.generators.length]
    const stepsShown = base.stepsShown > 0 ? base.stepsShown : 4
    rounds.push(generateRound(rng, generator, stepsShown, base.choiceCount))
  }

  const familyData: WildPredictionData = {
    rounds,
    timerSeconds: base.timerSeconds,
    roundCount: base.roundCount
  }

  return {
    profile: {
      patternGenerators: base.generators,
      choiceCount: base.choiceCount,
      timerSeconds: base.timerSeconds,
      roundCount: base.roundCount
    },
    familyData: familyData as unknown as Record<string, unknown>
  }
}

const RESULT_METRICS: ResultMetricDefinition[] = [
  { key: 'correctPct', label: 'Correct', format: 'percent' },
  { key: 'roundsCompleted', label: 'Rounds', format: 'integer' },
  { key: 'avgResponseMs', label: 'Avg Response', format: 'time' },
  { key: 'totalErrors', label: 'Errors', format: 'integer' }
]

export const WildPredictionFamily: PuzzleFamilyDefinition = {
  id: 'wild_prediction',
  displayName: 'Wild Prediction',
  category: 'cipher',
  generate,
  resultMetrics: RESULT_METRICS,
  scoringModel: 'logic-first'
}

registerValidator('wild_prediction', (data) => {
  const fam = data.familyData as unknown as WildPredictionData
  if (fam.rounds.length < 3) {
    return { valid: false, reason: 'Too few rounds' }
  }
  // Reject if all rounds use the same generator (monotone experience)
  const generators = new Set(fam.rounds.map((r) => r.generator))
  const allSameGenerator = generators.size === 1 && fam.rounds.length >= 4
  // Allow short single-generator sessions, but reject long trivial sequences
  if (
    allSameGenerator &&
    fam.rounds.every((r) => r.generator === 'alternating') &&
    fam.rounds.length >= 5
  ) {
    return { valid: false, reason: 'Too many alternating-only rounds' }
  }
  for (const round of fam.rounds) {
    if (round.choices.length < 2) {
      return { valid: false, reason: 'Round has fewer than 2 choices' }
    }
    // Correct answer must appear in choices
    const found = round.choices.some(
      (c) =>
        c.shape === round.correctAnswer.shape &&
        c.color === round.correctAnswer.color &&
        c.size === round.correctAnswer.size
    )
    if (!found) {
      return { valid: false, reason: 'Correct answer missing from choices' }
    }
  }
  return { valid: true }
})
