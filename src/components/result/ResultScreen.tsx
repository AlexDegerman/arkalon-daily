'use client'

import Link from 'next/link'
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
  familyName: string
  familyIndex: number
  score: number
  status: 'solved' | 'failed'
  elapsedMs: number
  metricDefinitions: ResultMetricDefinition[]
  metricValues: Record<string, unknown>
  rank?: number
  totalPlayers?: number
  percentile?: number
  todayScore?: number
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

export function ResultScreen({
  category,
  familyName,
  familyIndex,
  score,
  status,
  elapsedMs,
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

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col items-center gap-6 px-4 py-6 pb-24">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-text-muted">
          {cat.displayName.toUpperCase()}
        </p>
        <p className="mt-1 text-sm font-semibold text-text-primary">
          {familyName.toUpperCase()} COMPLETE
        </p>
      </div>

      {/* Score */}
      <div
        className={`rounded-xl border-2 bg-surface-panel px-10 py-6 text-center ${frameClass}`}
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
            familyName,
            familyIndex,
            score,
            metrics: metricValues,
            streakDays,
            playerName: playerName ?? 'Player',
            url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://daily.arkalon.fi'
          } satisfies ShareResult
        }
      />

      {/* Continuation */}
      <ContinuationPanel currentCategory={category} allStatuses={allStatuses} />

      {/* Network recommendation - below fold */}
      <NetworkRecommendation category={category} />

      {/* Navigation */}
      <div className="flex w-full gap-3">
        <Link
          href="/profile"
          className="flex-1 rounded-lg border border-border-subtle px-4 py-3 text-center text-xs font-semibold tracking-wider text-text-muted transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-accent-recall"
        >
          VIEW PROFILE
        </Link>
        <Link
          href="/"
          className="flex-1 rounded-lg border border-border-subtle px-4 py-3 text-center text-xs font-semibold tracking-wider text-text-muted transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          RETURN HOME
        </Link>
      </div>
    </div>
  )
}
