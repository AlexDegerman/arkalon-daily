'use client'

import { useEffect, useState, useCallback } from 'react'
import { LeaderboardRow } from './LeaderboardRow'
import { getLeaderboard } from '@/app/actions/getLeaderboard'
import { CATEGORIES, CATEGORY_ORDER } from '@/constants/categories'
import type { PuzzleCategory } from '@/types/puzzle'
import type {
  LeaderboardEntry,
  LeaderboardResult
} from '@/app/actions/getLeaderboard'

function getPlayerId(): string | null {
  try {
    return localStorage.getItem('arkalon_daily_player_id')
  } catch {
    return null
  }
}

export function LeaderboardView() {
  const [activeCategory, setActiveCategory] = useState<PuzzleCategory>('recall')
  const [result, setResult] = useState<LeaderboardResult | null>(null)
  const [loading, setLoading] = useState(false)

  const loadLeaderboard = useCallback(async (category: PuzzleCategory) => {
    const playerId = getPlayerId()
    if (!playerId) return

    setLoading(true)
    const res = await getLeaderboard(playerId, category)
    setResult(res)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLeaderboard(activeCategory)
  }, [activeCategory, loadLeaderboard])

  const cat = CATEGORIES[activeCategory]
  const entries = result?.entries ?? []
  const playerEntry = result?.playerEntry ?? null
  const playerInTop = entries.some((e) => e.isCurrentPlayer)
  const showPlayerSeparate = playerEntry && !playerInTop

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-4 px-4 py-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-widest text-text-primary">
          LEADERBOARD
        </h1>
        {result?.familyIndex !== undefined && (
          <span className="text-xs text-text-muted">
            {cat.displayName} #{result.familyIndex}
          </span>
        )}
      </div>

      {/* Category tabs */}
      <div
        className="flex gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Leaderboard category"
      >
        {CATEGORY_ORDER.map((slug) => {
          const c = CATEGORIES[slug]
          const isActive = activeCategory === slug
          return (
            <button
              key={slug}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(slug)}
              className={[
                'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                'focus-visible:outline-2 focus-visible:outline-accent-recall',
                isActive
                  ? 'bg-surface-panel text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              ].join(' ')}
              style={
                isActive
                  ? { borderBottom: `2px solid ${c.accentColor}` }
                  : undefined
              }
            >
              <span aria-hidden="true">{c.icon}</span>
              <span className="hidden sm:inline">{c.displayName}</span>
            </button>
          )
        })}
      </div>

      {/* Summary */}
      {result?.totalPlayers !== undefined && result.totalPlayers > 0 && (
        <p className="text-xs text-text-muted">
          {result.totalPlayers.toLocaleString()} players today
          {result.playerRank != null && (
            <span>
              {' '}
              &mdash; you ranked{' '}
              <span className="font-semibold text-text-primary">
                #{result.playerRank}
              </span>
            </span>
          )}
        </p>
      )}

      {/* Entries */}
      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      ) : result?.success === false ? (
        <div className="rounded-xl border border-border-subtle bg-surface-panel p-6 text-center">
          <p className="text-sm text-text-muted">
            {result.error ?? 'Could not load leaderboard.'}
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-panel p-6 text-center">
          <p className="text-sm text-text-muted">
            No results yet for today&apos;s {cat.displayName} puzzle.
          </p>
          <p className="mt-1 text-xs text-text-muted">Be the first to play!</p>
        </div>
      ) : (
        <div
          className="rounded-xl border border-border-subtle bg-bg-base p-2"
          role="list"
          aria-label={`${cat.displayName} leaderboard`}
        >
          {entries.map((entry, i) => (
            <div key={`${entry.rank}-${entry.displayName}`} role="listitem">
              <LeaderboardRow entry={entry} showSeparator={false} />
            </div>
          ))}

          {/* Player entry below top 50 */}
          {showPlayerSeparate && (
            <div role="listitem">
              <LeaderboardRow
                entry={playerEntry as LeaderboardEntry}
                showSeparator={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Not yet played prompt */}
      {result?.success && !playerEntry && entries.length > 0 && (
        <p className="text-center text-xs text-text-muted">
          Play today&apos;s {cat.displayName} puzzle to appear on the
          leaderboard.
        </p>
      )}
    </div>
  )
}
