'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Trophy, User, Gamepad2 } from 'lucide-react'
import { LeaderboardRow } from './LeaderboardRow'
import { getLeaderboard } from '@/app/actions/getLeaderboard'
import { CATEGORIES, CATEGORY_ORDER } from '@/constants/categories'
import { SoundControlButton } from '@/components/ui/SoundControlButton'
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
    <div className="mx-auto w-full max-w-lg lg:max-w-4xl xl:max-w-5xl px-3 sm:px-4 py-3 sm:py-5 flex flex-col flex-1 pb-16">
      {/* Category Tabs */}
      <div
        className="grid grid-cols-5 gap-1.5 w-full mb-3"
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
                'flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg border text-xs font-bold transition-all cursor-pointer',
                isActive
                  ? 'bg-surface-panel text-text-primary'
                  : 'border-border-subtle bg-bg-base/60 text-text-muted hover:text-text-primary'
              ].join(' ')}
              style={
                isActive
                  ? {
                      borderColor: c.accentColor,
                      boxShadow: `0 0 10px ${c.accentColor}25`
                    }
                  : undefined
              }
            >
              <span className="text-base leading-none" aria-hidden="true">
                {c.icon}
              </span>
              <span
                className="text-[10px] uppercase tracking-wider font-mono font-black"
                style={{ color: isActive ? c.accentColor : undefined }}
              >
                {c.displayName}
              </span>
            </button>
          )
        })}
      </div>

      {/* Summary Subtext */}
      <div className="flex items-center justify-between text-xs font-mono text-text-muted px-1 mb-2">
        <span>
          {cat.displayName.toUpperCase()} #{result?.familyIndex ?? 1}
        </span>
        {result?.totalPlayers !== undefined && result.totalPlayers > 0 ? (
          <span>
            {result.totalPlayers.toLocaleString()} PLAYERS
            {result.playerRank != null && (
              <span className="text-text-primary font-bold">
                {' '}
                • YOUR RANK #{result.playerRank}
              </span>
            )}
          </span>
        ) : (
          <span className="text-text-muted">0 PLAYERS TODAY</span>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center py-16 rounded-xl border border-border-subtle bg-surface-panel">
          <p className="text-xs font-mono text-text-muted animate-pulse">
            TRANSMITTING TELEMETRY...
          </p>
        </div>
      ) : result?.success === false ? (
        <div className="rounded-xl border border-border-subtle bg-surface-panel p-6 text-center">
          <p className="text-xs font-mono text-status-fail">
            {result.error ?? 'Could not load leaderboard.'}
          </p>
        </div>
      ) : entries.length === 0 ? (
        /* Empty State: Prompt to Claim Rank #1 */
        <div className="rounded-2xl border border-border-subtle bg-surface-panel/95 p-8 text-center flex flex-col items-center gap-3.5 shadow-2xl">
          <div
            className={`frame-${activeCategory} w-12 h-12 rounded-xl flex items-center justify-center text-2xl`}
          >
            {cat.icon}
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="font-mono text-sm font-black tracking-widest text-text-primary uppercase">
              NO RECORDS SUBMITTED TODAY
            </h3>
            <p className="text-xs text-text-muted max-w-sm leading-relaxed">
              Nobody has submitted a completed challenge for today&apos;s{' '}
              <strong style={{ color: cat.accentColor }}>
                {cat.displayName}
              </strong>{' '}
              puzzle yet.
            </p>
          </div>

          <Link
            href={`/${activeCategory}`}
            className={`btn-${activeCategory} mt-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg`}
          >
            <span className={`title-${activeCategory}`}>
              PLAY TO CLAIM RANK #1 &rarr;
            </span>
          </Link>
        </div>
      ) : (
        /* Entry List */
        <div
          className="rounded-xl border border-border-subtle bg-bg-base/90 p-2 flex flex-col gap-1 shadow-lg"
          role="list"
          aria-label={`${cat.displayName} leaderboard`}
        >
          {entries.map((entry) => (
            <div key={`${entry.rank}-${entry.displayName}`} role="listitem">
              <LeaderboardRow entry={entry} showSeparator={false} />
            </div>
          ))}

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
    </div>
  )
}
