import { getScoreTierClass } from '@/lib/format'
import { formatElapsedMs } from '@/lib/format'
import type { LeaderboardEntry } from '@/app/actions/getLeaderboard'

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  showSeparator?: boolean
}

export function LeaderboardRow({
  entry,
  showSeparator = false
}: LeaderboardRowProps) {
  const tierClass = getScoreTierClass(entry.normalizedScore)

  return (
    <>
      {showSeparator && (
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 border-t border-dashed border-border-subtle" />
          <span className="text-xs text-text-muted">...</span>
          <div className="flex-1 border-t border-dashed border-border-subtle" />
        </div>
      )}
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
            entry.rank <= 3 ? 'font-bold text-text-primary' : 'text-text-muted'
          ].join(' ')}
          aria-label={`Rank ${entry.rank}`}
        >
          {entry.rank <= 3
            ? ['🥇', '🥈', '🥉'][entry.rank - 1]
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
    </>
  )
}
