import { cookies } from 'next/headers'
import { getLeaderboard } from '@/app/actions/getLeaderboard'
import { LeaderboardView } from '@/components/leaderboard/LeaderboardView'

export default async function LeaderboardPage() {
  const cookieStore = await cookies()
  const playerId = cookieStore.get('arkalon_core_id')?.value ?? null
  const initialResult = await getLeaderboard(playerId, 'recall', 'daily')

  return (
    <main className="flex-1 overflow-y-auto">
      <LeaderboardView initialResult={initialResult} />
    </main>
  )
}
