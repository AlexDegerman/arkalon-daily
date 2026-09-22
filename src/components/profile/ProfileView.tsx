'use client'

import type {
  PlayerProfile,
  CategoryStats,
  PuzzleCategory
} from '@/types/puzzle'
import { CATEGORY_ORDER } from '@/constants/categories'
import { SkillProfile } from './SkillProfile'
import { CategoryStatsPanel } from './CategoryStatsPanel'
import { PlayerAvatar } from './PlayerAvatar'
import { formatDateTime } from '@/lib/format'

interface ProfileViewProps {
  profile: PlayerProfile
  stats: CategoryStats[]
}

export function ProfileView({ profile, stats }: ProfileViewProps) {
  const averageScores = Object.fromEntries(
    stats
      .filter((s) => s.daysPlayed >= 3)
      .map((s) => [s.category as PuzzleCategory, s.averageScore])
  ) as Partial<Record<PuzzleCategory, number>>
  const totalDaysPlayed = stats.reduce((sum, s) => sum + s.daysPlayed, 0)
  const totalActiveStreaks = stats.filter((s) => s.currentStreak > 0).length
  const displayName = profile.displayName ?? 'Player'

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-5 px-4 py-6 pb-24">
      {/* Identity Card */}
      <div className="rounded-xl border border-border-subtle bg-surface-panel p-4">
        <div className="flex items-center gap-3">
          <PlayerAvatar playerId={profile.id} displayName={displayName} />
          <div>
            <p className="font-semibold text-text-primary">{displayName}</p>
            <p className="mt-1 text-xs text-text-muted">
              Playing since {formatDateTime(profile.createdAt)}
            </p>
          </div>
        </div>
        {(totalDaysPlayed > 0 ||
          totalActiveStreaks > 0 ||
          profile.trialsCompleted.length < CATEGORY_ORDER.length) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {totalDaysPlayed > 0 && (
              <span className="rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-text-muted">
                {totalDaysPlayed} {totalDaysPlayed === 1 ? 'PUZZLE' : 'PUZZLES'}{' '}
                PLAYED
              </span>
            )}
            {totalActiveStreaks > 0 && (
              <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-[#F59E0B]">
                {totalActiveStreaks}{' '}
                {totalActiveStreaks === 1 ? 'STREAK' : 'STREAKS'} ACTIVE
              </span>
            )}
            {profile.trialsCompleted.length < CATEGORY_ORDER.length && (
              <span className="rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-text-muted">
                TRIALS {profile.trialsCompleted.length}/{CATEGORY_ORDER.length}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Skill Profile */}
      <SkillProfile scores={averageScores} />

      {/* Per-Category Stats */}
      <CategoryStatsPanel stats={stats} />

      {/* Arkalon Core Network Account & Recovery Card */}
      <div
        className="w-full rounded-xl border border-border-subtle bg-surface-panel p-4"
        id="recovery-section"
      >
        <p className="mb-1 text-xs uppercase tracking-wider text-text-muted font-semibold">
          Arkalon Core Identity
        </p>
        <p className="mb-3 text-xs text-text-muted leading-relaxed">
          Your profile is anchored by Arkalon Core. Access your recovery code or
          switch devices on the Network Hub.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <a
            href="https://network.rpsleague.fi/settings?returnTo=https://daily.rpsleague.fi/profile"
            className="flex-1 inline-flex items-center justify-center rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary hover:border-accent-recall transition-colors"
          >
            Reroll Nickname ↗
          </a>
          <a
            href="https://network.rpsleague.fi/settings?tab=identity&returnTo=https://daily.rpsleague.fi/profile"
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-accent-recall/10 border border-accent-recall/40 px-3 py-2 text-xs font-semibold text-accent-recall hover:bg-accent-recall/20 transition-colors"
          >
            Reveal Recovery Code ↗
          </a>
        </div>
      </div>
    </div>
  )
}
