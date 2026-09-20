import { LeaderboardView } from '@/components/leaderboard/LeaderboardView'
import { GameHeader } from '@/components/layout/GameHeader'
import { BottomNav } from '@/components/layout/BottomNav'

export default function LeaderboardPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <GameHeader />
      <main className="flex-1 overflow-y-auto">
        <LeaderboardView />
      </main>
      <BottomNav />
    </div>
  )
}
