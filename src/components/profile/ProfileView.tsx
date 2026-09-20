'use client'

import type {
  PlayerProfile,
  CategoryStats,
  PuzzleCategory
} from '@/types/puzzle'
import { SkillProfile } from './SkillProfile'
import { CategoryStatsPanel } from './CategoryStatsPanel'
import { RecoveryCodeSection } from './RecoveryCodeSection'
import { formatDateTime } from '@/lib/format'
import { CATEGORY_ORDER } from '@/constants/categories'

interface ProfileViewProps {
  profile: PlayerProfile
  stats: CategoryStats[]
}

export function ProfileView({ profile, stats }: ProfileViewProps) {
  // Build average score map for skill profile - only show categories with >= 3 submissions
  const averageScores = Object.fromEntries(
    stats
      .filter((s) => s.daysPlayed >= 3)
      .map((s) => [s.category as PuzzleCategory, s.averageScore])
  ) as Partial<Record<PuzzleCategory, number>>

  const totalDaysPlayed = stats.reduce((sum, s) => sum + s.daysPlayed, 0)

  const displayName =
    profile.displayName ??
    profile.recoveryCode
      .split('-')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join('')

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-5 px-4 py-6 pb-24">
      {/* Identity */}
      <div className="rounded-xl border border-border-subtle bg-surface-panel p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-border-subtle text-lg">
            {'\uD83E\uDDD1'}
          </div>
          <div>
            <p className="font-semibold text-text-primary">{displayName}</p>
            <p className="mt-1 text-xs text-text-muted">
              Playing since {formatDateTime(profile.createdAt)}
              {totalDaysPlayed > 0 && (
                <span className="ml-2">
                  &middot; {totalDaysPlayed} total{' '}
                  {totalDaysPlayed === 1 ? 'puzzle' : 'puzzles'} played
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Skill profile */}
      <SkillProfile scores={averageScores} />

      {/* Per-category stats */}
      <CategoryStatsPanel stats={stats} />

      {/* Recovery code */}
      <RecoveryCodeSection recoveryCode={profile.recoveryCode} />
    </div>
  )
}
