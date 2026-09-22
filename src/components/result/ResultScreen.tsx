'use client'

import type {
  PuzzleCategory,
  CategoryStatus,
  ResultMetricDefinition,
  ShareResult
} from '@/types/puzzle'
import { CATEGORIES } from '@/constants/categories'
import { getScoreTierClass, getScoreRarity } from '@/lib/format'
import { CategoryMetrics } from './CategoryMetrics'
import { ContinuationPanel } from './ContinuationPanel'
import { NetworkRecommendation } from './NetworkRecommendation'
import { ShareResultButton } from '@/components/share/ShareResultButton'

interface ResultScreenProps {
  category: PuzzleCategory
  familyIndex: number
  score: number
  metricDefinitions: ResultMetricDefinition[]
  metricValues: Record<string, unknown>
  rank?: number
  totalPlayers?: number
  percentile?: number
  personalBest?: number
  averageScore?: number
  streakDays: number
  allStatuses: CategoryStatus[]
  playerName?: string
}

const SCORE_LABEL: { min: number; label: string }[] = [
  { min: 96, label: 'Flawless' },
  { min: 90, label: 'Excellent run' },
  { min: 80, label: 'Strong performance' },
  { min: 70, label: 'Solid effort' },
  { min: 50, label: 'A decent attempt' },
  { min: 0, label: 'The challenge proved formidable' }
]

function getScoreLabel(score: number): string {
  for (const { min, label } of SCORE_LABEL) {
    if (score >= min) return label
  }
  return 'Recorded'
}

const RARITY_FRAME: Record<string, string> = {
  mythical: 'border-[#EF4444]',
  legendary: 'border-[#F59E0B]',
  epic: 'border-[#A855F7]',
  rare: 'border-[#3B82F6]',
  common: 'border-border-subtle'
}

const RARITY_AURA: Record<string, string> = {
  mythical: 'aura-mythical',
  legendary: 'aura-legendary',
  epic: 'aura-epic',
  rare: 'aura-rare',
  common: 'aura-common'
}

export function ResultScreen({
  category,
  familyIndex,
  score,
  metricDefinitions,
  metricValues,
  rank,
  totalPlayers,
  percentile,
  personalBest,
  averageScore,
  streakDays,
  allStatuses,
  playerName
}: ResultScreenProps) {
  const cat = CATEGORIES[category]
  const tierClass = getScoreTierClass(score)
  const rarity = getScoreRarity(score)
  const frameClass = RARITY_FRAME[rarity] ?? 'border-border-subtle'
  const auraClass = RARITY_AURA[rarity] ?? ''

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col items-center gap-6 px-4 py-6 pb-24">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-text-muted">
          {cat.displayName.toUpperCase()} #{familyIndex}
        </p>
        <p className="mt-1 text-sm font-semibold text-text-primary">
          CHALLENGE COMPLETE
        </p>
      </div>

      {/* Score */}
      <div
        className={`relative isolate rounded-xl border-2 bg-surface-panel px-10 py-6 text-center ${frameClass} ${auraClass}`}
      >
        <div
          className={`font-mono text-6xl font-bold ${tierClass}`}
          aria-label={`Score: ${score}`}
        >
          {score}
        </div>
        <div className="mt-1 text-xs uppercase tracking-widest text-text-muted">
          Score
        </div>
        <div className="mt-2 text-sm text-text-muted">
          {getScoreLabel(score)}
        </div>
      </div>

      {/* Category metrics */}
      <div className="w-full rounded-xl border border-border-subtle bg-surface-panel p-4">
        <CategoryMetrics metrics={metricDefinitions} values={metricValues} />
      </div>

      {/* Ranking */}
      {rank !== undefined && totalPlayers !== undefined && (
        <div className="w-full rounded-xl border border-border-subtle bg-surface-panel p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-text-muted">
            Today&apos;s Ranking
          </p>
          <p className="font-mono text-sm text-text-primary">
            #{rank.toLocaleString()} of {totalPlayers.toLocaleString()} players
          </p>
          {percentile !== undefined && (
            <p className="mt-1 text-xs text-text-muted">
              Top {percentile.toFixed(1)}% &middot; {cat.displayName}
            </p>
          )}
        </div>
      )}

      {/* Per-category stats */}
      <div className="w-full rounded-xl border border-border-subtle bg-surface-panel p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-text-muted">
          Your {cat.displayName} Stats
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-text-muted">Today</p>
            <p className={`font-mono text-lg font-bold ${tierClass}`}>
              {score}
            </p>
          </div>
          {personalBest !== undefined && (
            <div>
              <p className="text-xs text-text-muted">Personal Best</p>
              <p className="font-mono text-lg font-bold text-text-primary">
                {personalBest}
              </p>
            </div>
          )}
          {averageScore !== undefined && (
            <div>
              <p className="text-xs text-text-muted">Average</p>
              <p className="font-mono text-sm text-text-primary">
                {averageScore}
              </p>
            </div>
          )}
          {streakDays > 0 && (
            <div>
              <p className="text-xs text-text-muted">Streak</p>
              <p className="text-sm text-text-primary">
                {'\uD83D\uDD25'} {streakDays}{' '}
                {streakDays === 1 ? 'day' : 'days'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Share */}
      <ShareResultButton
        result={
          {
            type: category,
            category,
            familyIndex,
            score,
            metrics: metricValues,
            streakDays,
            playerName: playerName ?? 'Player',
            url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://daily.rpsleague.fi'
          } satisfies ShareResult
        }
      />

      {/* Continuation */}
      <ContinuationPanel currentCategory={category} allStatuses={allStatuses} />

      {/* Network recommendation - below fold */}
      <NetworkRecommendation />
    </div>
  )
}
