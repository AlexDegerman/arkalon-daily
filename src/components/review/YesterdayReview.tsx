'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoreDistribution } from './ScoreDistribution'
import { getYesterdayReview } from '@/app/actions/getYesterdayReview'
import { CATEGORIES } from '@/constants/categories'
import { getScoreTierClass } from '@/lib/format'
import type { PuzzleCategory } from '@/types/puzzle'
import type { YesterdayReviewResult } from '@/app/actions/getYesterdayReview'

interface YesterdayReviewProps {
  category: PuzzleCategory
}

function getPlayerId(): string | null {
  try {
    return localStorage.getItem('arkalon_daily_player_id')
  } catch {
    return null
  }
}

export function YesterdayReview({ category }: YesterdayReviewProps) {
  const router = useRouter()
  const [result, setResult] = useState<YesterdayReviewResult | null>(null)
  const [loading, setLoading] = useState(true)
  const cat = CATEGORIES[category]

  useEffect(() => {
    const playerId = getPlayerId()
    if (!playerId) {
      router.replace('/')
      return
    }
    getYesterdayReview(playerId, category).then((res) => {
      setResult(res)
      setLoading(false)
    })
  }, [category, router])

  if (loading) {
    return (
      <div className="flex min-h-50 items-center justify-center">
        <p className="text-sm text-text-muted">Loading review...</p>
      </div>
    )
  }

  if (!result?.success) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-panel p-6 text-center">
        <p className="text-sm text-text-muted">
          {result?.error ?? "Yesterday's review is not available."}
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 text-xs text-accent-recall underline underline-offset-2"
        >
          Back to today&apos;s puzzles
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-5 px-4 py-6 pb-24">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-wider text-text-muted">
          Yesterday&apos;s Review
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-widest text-text-primary">
          {cat.displayName.toUpperCase()}
          {result.familyIndex !== undefined && (
            <span className="ml-2 text-sm font-normal text-text-muted">
              #{result.familyIndex}
            </span>
          )}
        </h1>
      </div>

      {/* Community stats */}
      <div className="rounded-xl border border-border-subtle bg-surface-panel p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-text-muted">
          Community Stats
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-text-muted">Players</p>
            <p className="font-mono text-sm font-bold text-text-primary">
              {result.totalPlayers?.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Average</p>
            <p className="font-mono text-sm font-bold text-text-primary">
              {result.averageScore?.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Median</p>
            <p className="font-mono text-sm font-bold text-text-primary">
              {result.medianScore}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Top 1%</p>
            <p className="font-mono text-sm font-bold text-text-primary">
              {result.topOneThreshold}+
            </p>
          </div>
        </div>
      </div>

      {/* Score distribution */}
      <div className="rounded-xl border border-border-subtle bg-surface-panel p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-text-muted">
          Score Distribution
        </p>
        {result.scoreBuckets && (
          <ScoreDistribution buckets={result.scoreBuckets} />
        )}
      </div>

      {/* Player result */}
      {result.playerScore !== null && result.playerScore !== undefined ? (
        <div className="rounded-xl border border-border-subtle bg-surface-panel p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-text-muted">
            Your Result
          </p>
          <div className="flex items-center gap-4">
            <span
              className={`font-mono text-3xl font-bold ${getScoreTierClass(result.playerScore)}`}
            >
              {result.playerScore}
            </span>
            <div>
              {result.playerRank !== null && (
                <p className="text-sm text-text-primary">
                  Rank #{result.playerRank?.toLocaleString()}
                </p>
              )}
              {result.playerPercentile !== null && (
                <p className="text-xs text-text-muted">
                  Top {result.playerPercentile?.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-surface-panel p-4">
          <p className="text-sm text-text-muted">
            You didn&apos;t play yesterday&apos;s {cat.displayName} puzzle.
          </p>
        </div>
      )}

      <button
        onClick={() => router.push('/')}
        className="w-full rounded-lg border border-border-subtle px-4 py-3 text-xs font-semibold tracking-wider text-text-muted transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent-recall"
      >
        [ BACK TO TODAY&apos;S PUZZLES ]
      </button>
    </div>
  )
}
