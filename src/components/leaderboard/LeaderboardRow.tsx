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
  return (
    <>
      {showSeparator && (
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 border-t border-dashed border-border-subtle" />
          <span className="text-xs text-text-muted">...</span>
          <div className="flex-1 border-t border-dashed border-border-subtle" />
        </div>
      )}
      {isAggregate ? (
        <div
          className={[
            'flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors',
            entry.isCurrentPlayer
              ? 'bg-accent-recall/10 border border-accent-recall/30'
              : 'border border-transparent hover:bg-surface-panel'
          ].join(' ')}
          aria-current={entry.isCurrentPlayer ? 'true' : undefined}
        >
          {/* Rank */}
          <span
            className={[
              'w-7 shrink-0 text-right font-mono text-sm',
              entry.rank <= 3
                ? 'font-bold text-text-primary'
                : 'text-text-muted'
            ].join(' ')}
            aria-label={`Rank ${entry.rank}`}
          >
            {entry.rank <= 3
              ? ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][entry.rank - 1]
              : `#${entry.rank}`}
          </span>
          {/* Name + per-category clears strip on TOTAL */}
          <span
            className={[
              'flex-1 min-w-0 truncate text-sm',
              entry.isCurrentPlayer
                ? 'font-semibold text-text-primary'
                : 'text-text-primary'
            ].join(' ')}
          >
            {entry.displayName}
            {entry.isCurrentPlayer && (
              <span className="ml-1.5 text-xs text-text-muted">(you)</span>
            )}
            {scope === 'total' && entry.clearsByCategory && (
              <span className="block truncate text-[9px] font-mono leading-tight">
                {CATEGORY_ORDER.map((slug, i) => (
                  <span
                    key={slug}
                    style={{ color: `${CATEGORIES[slug].accentColor}cc` }}
                  >
                    {entry.clearsByCategory?.[slug] ?? 0}
                    {i < CATEGORY_ORDER.length - 1 ? (
                      <span className="text-text-muted">·</span>
                    ) : null}
                  </span>
                ))}
              </span>
            )}
          </span>
          <span
            className={`w-10 shrink-0 text-right font-mono text-sm font-bold ${avgTierClass}`}
            aria-label={`Average score ${entry.avgScore}`}
          >
            {entry.avgScore?.toFixed(1)}
          </span>
          <span className="w-10 shrink-0 text-right font-mono text-xs text-text-primary">
            {entry.clears}
          </span>
          <span className="w-8 shrink-0 text-right font-mono text-xs text-text-muted">
            {entry.bestScore}
          </span>
          <span className="w-10 shrink-0 text-right font-mono text-xs text-text-muted">
            {entry.totalPoints}
          </span>
          <span className="w-9 shrink-0 text-right font-mono text-xs font-bold text-[#F59E0B]">
            {entry.streakDays && entry.streakDays > 0 ? (
              <>
                {'\uD83D\uDD25'}
                {entry.streakDays}
              </>
            ) : (
              '—'
            )}
          </span>
        </div>
      ) : (
        <div
          className={[
            'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
            entry.isCurrentPlayer
              ? 'bg-accent-recall/10 border border-accent-recall/30'
              : 'border border-transparent hover:bg-surface-panel'
          ].join(' ')}
          aria-current={entry.isCurrentPlayer ? 'true' : undefined}
        >
          {/* Rank */}
          <span
            className={[
              'w-8 text-right font-mono text-sm',
              entry.rank <= 3
                ? 'font-bold text-text-primary'
                : 'text-text-muted'
            ].join(' ')}
            aria-label={`Rank ${entry.rank}`}
          >
            {entry.rank <= 3
              ? ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][entry.rank - 1]
              : `#${entry.rank}`}
          </span>
          {/* Name */}
          <span
            className={[
              'flex-1 truncate text-sm',
              entry.isCurrentPlayer
                ? 'font-semibold text-text-primary'
                : 'text-text-primary'
            ].join(' ')}
          >
            {entry.displayName}
            {entry.isCurrentPlayer && (
              <span className="ml-1.5 text-xs text-text-muted">(you)</span>
            )}
          </span>
          {/* Time */}
          <span className="font-mono text-xs text-text-muted">
            {formatElapsedMs(entry.elapsedMs)}
          </span>
          {/* Score */}
          <span
            className={`w-10 text-right font-mono text-sm font-bold ${tierClass}`}
            aria-label={`Score ${entry.normalizedScore}`}
          >
            {entry.normalizedScore}
          </span>
        </div>
      )}
    </>
  )
}
