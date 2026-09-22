import Link from 'next/link'
import { getScoreTierClass } from '@/lib/format'
import { formatElapsedMs } from '@/lib/format'
import { CATEGORIES, CATEGORY_ORDER } from '@/constants/categories'
import type { LeaderboardEntry } from '@/app/actions/getLeaderboard'
import type {
  LeaderboardPeriod,
  LeaderboardScope
} from '@/lib/leaderboardPeriods'

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  period: LeaderboardPeriod
  scope: LeaderboardScope
  showSeparator?: boolean
}

export function LeaderboardRow({
  entry,
  period,
  scope,
  showSeparator = false
}: LeaderboardRowProps) {
  const isAggregate = period !== 'daily' || scope === 'total'
  const tierClass = getScoreTierClass(entry.normalizedScore)
  const avgTierClass =
    entry.avgScore !== null ? getScoreTierClass(Math.round(entry.avgScore)) : ''

  const rankDisplay =
    entry.rank <= 3
      ? ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][entry.rank - 1]
      : `#${entry.rank}`

  const rowBgClass = entry.isCurrentPlayer
    ? 'bg-accent-recall/10'
    : 'hover:bg-surface-panel/50'

  return (
    <>
      {showSeparator && (
        <tr>
          <td colSpan={isAggregate ? 7 : 4} className="py-2 px-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-dashed border-border-subtle" />
              <span className="text-xs text-text-muted font-mono">...</span>
              <div className="flex-1 border-t border-dashed border-border-subtle" />
            </div>
          </td>
        </tr>
      )}

      <tr
        className={`transition-colors border-b border-border-subtle/40 ${rowBgClass}`}
        aria-current={entry.isCurrentPlayer ? 'true' : undefined}
      >
        {/* Rank */}
        <td className="py-2.5 px-2.5 sm:px-3 align-top text-center font-mono text-xs sm:text-sm whitespace-nowrap w-8 sm:w-10">
          <span
            className={
              entry.rank <= 3
                ? 'text-sm sm:text-base leading-none'
                : 'text-text-muted'
            }
          >
            {rankDisplay}
          </span>
        </td>

        {/* Player Column */}
        <td className="py-2.5 px-2 sm:px-3 align-top">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={
                  entry.isCurrentPlayer
                    ? '/profile'
                    : `/profile/${entry.playerId}`
                }
                className={[
                  'font-bold text-xs sm:text-sm wrap-break-word transition-colors hover:underline underline-offset-4',
                  entry.isCurrentPlayer
                    ? 'text-accent-recall'
                    : 'text-text-primary hover:text-accent-recall'
                ].join(' ')}
              >
                {entry.displayName}
              </Link>
              {entry.isCurrentPlayer && (
                <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-accent-recall/20 text-accent-recall border border-accent-recall/30">
                  YOU
                </span>
              )}
            </div>

            {/* Per-category clears on TOTAL scope */}
            {scope === 'total' && entry.clearsByCategory && (
              <div className="flex items-center gap-1 mt-1 overflow-x-auto scrollbar-none pb-0.5">
                {CATEGORY_ORDER.map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-panel border border-border-subtle shrink-0"
                    style={{ color: `${CATEGORIES[slug].accentColor}` }}
                  >
                    <span>{CATEGORIES[slug].displayName.slice(0, 3)}</span>
                    <span className="font-bold text-text-primary">
                      {entry.clearsByCategory?.[slug] ?? 0}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Mobile stats row (< 600px) */}
            <div className="flex flex-col min-[600px]:hidden mt-2 text-[10px] font-mono">
              {isAggregate ? (
                <div className="overflow-x-auto pb-0.5 scrollbar-none">
                  <div className="flex gap-3 min-w-max text-text-muted font-bold uppercase tracking-wider">
                    <div className="w-10">Avg</div>
                    <div className="w-9">Clr</div>
                    <div className="w-10">Best</div>
                    <div className="w-12">Pts</div>
                    <div className="w-11">Strk</div>
                  </div>
                  <div className="flex gap-3 min-w-max font-medium items-center mt-0.5">
                    <div className={`w-10 font-bold ${avgTierClass}`}>
                      {entry.avgScore !== null
                        ? entry.avgScore.toFixed(1)
                        : '-'}
                    </div>
                    <div className="w-9 text-text-primary font-bold">
                      {entry.clears ?? 0}
                    </div>
                    <div className="w-10 text-text-muted">
                      {entry.bestScore ?? '-'}
                    </div>
                    <div className="w-12 text-text-muted">
                      {entry.totalPoints ?? 0}
                    </div>
                    <div className="w-11 font-bold text-[#F59E0B]">
                      {entry.streakDays && entry.streakDays > 0
                        ? `\uD83D\uDD25${entry.streakDays}d`
                        : '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-text-muted">
                  <span>
                    TIME:{' '}
                    <span className="text-text-primary font-semibold">
                      {formatElapsedMs(entry.elapsedMs)}
                    </span>
                  </span>
                  <span className="text-border-subtle">·</span>
                  <span>
                    SCORE:{' '}
                    <span className={`font-bold ${tierClass}`}>
                      {entry.normalizedScore}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Desktop cells (>= 600px) */}
        {isAggregate ? (
          <>
            <td className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-mono text-sm font-bold align-middle">
              <span className={avgTierClass}>
                {entry.avgScore !== null ? entry.avgScore.toFixed(1) : '-'}
              </span>
            </td>
            <td className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-mono text-xs text-text-primary align-middle">
              {entry.clears ?? 0}
            </td>
            <td className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-mono text-xs text-text-muted align-middle">
              {entry.bestScore ?? '-'}
            </td>
            <td className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-mono text-xs text-text-muted align-middle">
              {entry.totalPoints ?? 0}
            </td>
            <td className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-mono text-xs font-bold text-[#F59E0B] align-middle">
              {entry.streakDays && entry.streakDays > 0 ? (
                <>
                  {'\uD83D\uDD25'}
                  {entry.streakDays}d
                </>
              ) : (
                '—'
              )}
            </td>
          </>
        ) : (
          <>
            <td className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-mono text-xs text-text-muted align-middle">
              {formatElapsedMs(entry.elapsedMs)}
            </td>
            <td className="hidden min-[600px]:table-cell py-2.5 px-3 text-right font-mono text-sm font-bold align-middle">
              <span className={tierClass}>{entry.normalizedScore}</span>
            </td>
          </>
        )}
      </tr>
    </>
  )
}
