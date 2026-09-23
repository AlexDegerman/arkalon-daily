'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { LeaderboardRow } from './LeaderboardRow'
import { getLeaderboard } from '@/app/actions/getLeaderboard'
import { CATEGORIES, CATEGORY_ORDER } from '@/constants/categories'
import {
  PERIOD_LABELS,
  type LeaderboardPeriod,
  type LeaderboardScope
} from '@/lib/leaderboardPeriods'
import type {
  LeaderboardEntry,
  LeaderboardResult
} from '@/app/actions/getLeaderboard'

const TOTAL_TAB = {
  icon: '✦',
  displayName: 'Total',
  accentColor: '#e8edf4'
}

function getPlayerId(): string | null {
  try {
    return localStorage.getItem('arkalon_daily_player_id')
  } catch {
    return null
  }
}

interface LeaderboardViewProps {
  initialResult?: LeaderboardResult | null
}

export function LeaderboardView({ initialResult }: LeaderboardViewProps) {
  const [activeCategory, setActiveCategory] =
    useState<LeaderboardScope>('recall')
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily')
  const [result, setResult] = useState<LeaderboardResult | null>(
    initialResult ?? null
  )
  const [loading, setLoading] = useState(false)

  const loadLeaderboard = useCallback(
    async (category: LeaderboardScope, period: LeaderboardPeriod) => {
      const playerId = getPlayerId()
      setLoading(true)
      const res = await getLeaderboard(playerId, category, period)
      setResult(res)
      setLoading(false)
    },
    []
  )

  useEffect(() => {
    // Skip initial fetch if pre-rendered from server props
    if (initialResult && activeCategory === 'recall' && period === 'daily') {
      return
    }
    loadLeaderboard(activeCategory, period)
  }, [activeCategory, period, loadLeaderboard, initialResult])

  const cat =
    activeCategory === 'total' ? TOTAL_TAB : CATEGORIES[activeCategory]
  const isAggregate = period !== 'daily' || activeCategory === 'total'
  const entries = result?.entries ?? []
  const playerEntry = result?.playerEntry ?? null
  const playerInTop = entries.some((e) => e.isCurrentPlayer)
  const showPlayerSeparate = playerEntry && !playerInTop
  const provisional = result?.playerProvisional ?? null
  const periodNoun =
    period === 'weekly'
      ? 'this week'
      : period === 'alltime'
        ? 'all-time'
        : 'today'

  return (
    <div className="mx-auto w-full max-w-lg lg:max-w-4xl xl:max-w-5xl px-3 sm:px-4 py-3 sm:py-5 flex flex-col flex-1 pb-16">
      {/* Category Tabs */}
      <div
        className="grid grid-cols-6 gap-1 w-full mb-2"
        role="tablist"
        aria-label="Leaderboard category"
      >
        {[...CATEGORY_ORDER, 'total' as const].map((slug) => {
          const c = slug === 'total' ? TOTAL_TAB : CATEGORIES[slug]
          const isActive = activeCategory === slug
          return (
            <button
              key={slug}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(slug)}
              className={[
                'flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-lg border text-xs font-bold transition-all cursor-pointer',
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
                className="text-[9px] uppercase tracking-wider font-mono font-black"
                style={{ color: isActive ? c.accentColor : undefined }}
              >
                {c.displayName}
              </span>
            </button>
          )
        })}
      </div>
      {/* Period Pills */}
      <div
        className="flex items-center gap-1 self-start rounded-lg p-1 mb-3 border border-border-subtle bg-bg-base"
        role="tablist"
        aria-label="Leaderboard period"
      >
        {(['daily', 'weekly', 'alltime'] as const).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className="text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer"
            style={{
              backgroundColor: period === p ? '#39ff8a' : 'transparent',
              color: period === p ? '#0a0e14' : '#7c8ba1'
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Below-threshold placeholder for the current player */}
      {isAggregate && result?.success && result.playerQualified === false && (
        <div className="rounded-lg border border-border-subtle bg-surface-panel/90 px-3 py-2 mb-2 flex flex-col gap-1 font-mono text-[10px]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F59E0B] tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              PROVISIONAL STATUS
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: result?.threshold ?? 3 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-xs transition-colors ${
                    i < (provisional?.plays ?? 0)
                      ? 'bg-accent-recall'
                      : 'bg-border-subtle'
                  }`}
                />
              ))}
              <span className="ml-1 text-text-muted font-bold">
                {provisional?.plays ?? 0}/{result?.threshold}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-text-muted">
            <span>
              {provisional && provisional.plays >= (result.threshold ?? 0)
                ? 'Score 15+ on one puzzle to rank'
                : `${(result?.threshold ?? 0) - (provisional?.plays ?? 0)} more ${
                    (result?.threshold ?? 0) - (provisional?.plays ?? 0) === 1
                      ? 'puzzle'
                      : 'puzzles'
                  } to rank`}
            </span>
            {provisional && provisional.clears > 0 && (
              <span>
                Avg:{' '}
                <strong className="text-text-primary font-bold">
                  {provisional.avgScore.toFixed(1)}
                </strong>
              </span>
            )}
          </div>
        </div>
      )}

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
        period === 'daily' ? (
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
                {activeCategory === 'total' ? (
                  <>
                    Nobody has submitted a completed challenge for today&apos;s
                    puzzles yet.
                  </>
                ) : (
                  <>
                    Nobody has submitted a completed challenge for today&apos;s{' '}
                    <strong style={{ color: cat.accentColor }}>
                      {cat.displayName}
                    </strong>{' '}
                    puzzle yet.
                  </>
                )}
              </p>
            </div>
            <Link
              href={
                activeCategory === 'total' ? '/recall' : `/${activeCategory}`
              }
              className={
                activeCategory === 'total'
                  ? 'mt-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg border border-border-subtle bg-surface-panel text-text-primary'
                  : `btn-${activeCategory} mt-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg`
              }
            >
              <span
                className={
                  activeCategory === 'total'
                    ? undefined
                    : `title-${activeCategory}`
                }
              >
                PLAY TO CLAIM RANK #1 &rarr;
              </span>
            </Link>
          </div>
        ) : (
          /* Empty State: Nobody meets the minimum yet */
          <div className="rounded-2xl border border-border-subtle bg-surface-panel/95 p-8 text-center flex flex-col items-center gap-3.5 shadow-2xl">
            <div className="w-12 h-12 rounded-xl border border-border-subtle flex items-center justify-center text-2xl">
              {cat.icon}
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-mono text-sm font-black tracking-widest text-text-primary uppercase">
                Not enough data yet
              </h3>
              <p className="text-xs text-text-muted max-w-sm leading-relaxed">
                Rankings unlock once players meet the minimum of{' '}
                <strong className="text-text-primary">
                  {result?.threshold}
                </strong>{' '}
                puzzles {periodNoun}.
              </p>
            </div>
            <Link
              href={
                activeCategory === 'total' ? '/recall' : `/${activeCategory}`
              }
              className="mt-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg border border-border-subtle bg-surface-panel text-text-primary"
            >
              PLAY TO START CLIMBING &rarr;
            </Link>
          </div>
        )
      ) : (
        /* Entry List */
        <div className="rounded-xl border border-border-subtle bg-bg-base/90 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table
              className="w-full text-left border-collapse"
              aria-label={`${cat.displayName} leaderboard`}
            >
              <thead className="border-b border-border-subtle bg-surface-panel/60 text-[10px] font-mono uppercase text-text-muted">
                <tr>
                  <th className="py-2.5 px-2.5 sm:px-3 w-8 sm:w-10 text-center font-bold">
                    #
                  </th>
                  <th className="py-2.5 px-2 sm:px-3 font-bold">Player</th>
                  {isAggregate ? (
                    <>
                      <th className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-bold w-14">
                        Avg
                      </th>
                      <th className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-bold w-12">
                        Clr
                      </th>
                      <th className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-bold w-12">
                        Best
                      </th>
                      <th className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-bold w-16">
                        Pts
                      </th>
                      <th className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-bold w-14">
                        Strk
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-bold w-20">
                        Time
                      </th>
                      <th className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-bold w-16">
                        Score
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/30">
                {entries.map((entry) => (
                  <LeaderboardRow
                    key={`${entry.rank}-${entry.displayName}`}
                    entry={entry}
                    period={period}
                    scope={activeCategory}
                    showSeparator={false}
                  />
                ))}
                {showPlayerSeparate && (
                  <LeaderboardRow
                    entry={playerEntry as LeaderboardEntry}
                    period={period}
                    scope={activeCategory}
                    showSeparator={true}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
