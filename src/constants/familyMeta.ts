import type {
  PuzzleCategory,
  ResultMetricDefinition,
  ScoringModel
} from '@/types/puzzle'

export interface FamilyMeta {
  id: string
  displayName: string
  category: PuzzleCategory
  resultMetrics: ResultMetricDefinition[]
  scoringModel: ScoringModel
}

export const FAMILY_META: Record<PuzzleCategory, FamilyMeta> = {
  recall: {
    id: 'arkalon_vision',
    displayName: 'Arkalon Vision',
    category: 'recall',
    resultMetrics: [
      { key: 'accuracyPercent', label: 'Accuracy', format: 'percent' },
      { key: 'maxSequence', label: 'Max Sequence', format: 'integer' },
      { key: 'errors', label: 'Errors', format: 'integer' },
      { key: 'completionTimeMs', label: 'Completion Time', format: 'time' }
    ],
    scoringModel: 'continuous'
  },
  surge: {
    id: 'surge_frenzy',
    displayName: 'Surge Frenzy',
    category: 'surge',
    resultMetrics: [
      { key: 'avgReactionMs', label: 'Avg Reaction', format: 'integer' },
      { key: 'correctTaps', label: 'Correct Taps', format: 'integer' },
      { key: 'misses', label: 'Misses', format: 'integer' },
      { key: 'bestCombo', label: 'Best Combo', format: 'integer' }
    ],
    scoringModel: 'speed-first'
  },
  cipher: {
    id: 'wild_prediction',
    displayName: 'Wild Prediction',
    category: 'cipher',
    resultMetrics: [
      { key: 'correctPct', label: 'Correct', format: 'percent' },
      { key: 'roundsCompleted', label: 'Rounds', format: 'integer' },
      { key: 'avgResponseMs', label: 'Avg Response', format: 'time' },
      { key: 'totalErrors', label: 'Errors', format: 'integer' }
    ],
    scoringModel: 'logic-first'
  },
  strike: {
    id: 'sniper_challenge',
    displayName: 'Sniper Challenge',
    category: 'strike',
    resultMetrics: [
      { key: 'perfectHits', label: 'Perfect Hits', format: 'integer' },
      { key: 'excellentHits', label: 'Excellent Hits', format: 'integer' },
      { key: 'accuracyPct', label: 'Accuracy', format: 'percent' },
      { key: 'avgDeviation', label: 'Avg Deviation', format: 'integer' },
      { key: 'totalShots', label: 'Total Shots', format: 'integer' }
    ],
    scoringModel: 'speed-first'
  },
  depths: {
    id: 'crystal_mine',
    displayName: 'Crystal Mine',
    category: 'depths',
    resultMetrics: [
      { key: 'depositsFound', label: 'Deposits Found', format: 'integer' },
      { key: 'chargesUsed', label: 'Charges Used', format: 'integer' },
      { key: 'efficiencyPct', label: 'Efficiency', format: 'percent' },
      { key: 'completionTimeMs', label: 'Completion Time', format: 'time' }
    ],
    scoringModel: 'logic-first'
  }
}
