import { ProfileView } from '@/components/profile/ProfileView'
import { BottomNav } from '@/components/layout/BottomNav'
import { GameHeader } from '@/components/layout/GameHeader'
import type { PlayerProfile, CategoryStats } from '@/types/puzzle'

// Placeholder data - replaced with live Server Actions in Commit 4.3
const PLACEHOLDER_PROFILE: PlayerProfile = {
  id: 'placeholder',
  displayName: null,
  recoveryCode: 'SWIFT-CRYSTAL-8214',
  createdAt: new Date(Date.now() - 86400 * 47 * 1000).toISOString(),
  trialsCompleted: ['recall', 'surge'],
  recoveryTutorialShown: true
}

const PLACEHOLDER_STATS: CategoryStats[] = [
  {
    category: 'recall',
    bestScore: 98,
    averageScore: 87,
    daysPlayed: 47,
    currentStreak: 7,
    longestStreak: 23,
    globalPercentile: 8.7
  },
  {
    category: 'surge',
    bestScore: 91,
    averageScore: 64,
    daysPlayed: 12,
    currentStreak: 3,
    longestStreak: 12,
    globalPercentile: 24.1
  }
]

export default function ProfilePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <GameHeader />
      <main className="flex-1">
        <h1 className="sr-only">Player Profile</h1>
        <ProfileView profile={PLACEHOLDER_PROFILE} stats={PLACEHOLDER_STATS} />
      </main>
      <BottomNav />
    </div>
  )
}
