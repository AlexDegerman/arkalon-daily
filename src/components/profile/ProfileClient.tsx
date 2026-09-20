'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GameHeader } from '@/components/layout/GameHeader'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProfileView } from './ProfileView'
import { RecoveryTutorialOverlay } from './RecoveryTutorialOverlay'
import { RecoveryCodeEntry } from './RecoveryCodeEntry'
import { getPlayerProfile } from '@/app/actions/getPlayerProfile'
import { restoreProfile } from '@/app/actions/restoreProfile'
import { markRecoveryTutorialShown } from '@/app/actions/markRecoveryTutorialShown'
import type { PlayerProfile, CategoryStats } from '@/types/puzzle'

type PagePhase = 'loading' | 'loaded' | 'error' | 'no-player'

export function ProfileClient() {
  const router = useRouter()
  const [phase, setPhase] = useState<PagePhase>('loading')
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [stats, setStats] = useState<CategoryStats[]>([])
  const [showTutorial, setShowTutorial] = useState(false)

  function getPlayerId(): string | null {
    try {
      return localStorage.getItem('arkalon_daily_player_id')
    } catch {
      return null
    }
  }

  useEffect(() => {
    const playerId = getPlayerId()
    if (!playerId) {
      setPhase('no-player')
      return
    }

    getPlayerProfile(playerId).then((res) => {
      if (!res.success || !res.profile) {
        setPhase('error')
        return
      }
      setProfile(res.profile)
      setStats(res.stats ?? [])
      // Show tutorial overlay if this is the first profile visit
      if (!res.profile.recoveryTutorialShown) {
        setShowTutorial(true)
      }
      setPhase('loaded')
    })
  }, [])

  const handleTutorialDismiss = useCallback(async () => {
    setShowTutorial(false)
    // Set localStorage flag so CategorySurface knows to suppress recovery prompt
    try {
      localStorage.setItem('arkalon_daily_recovery_tutorial_shown', 'true')
    } catch {
      // localStorage unavailable
    }
    const playerId = getPlayerId()
    if (playerId) {
      await markRecoveryTutorialShown(playerId)
      setProfile((prev) =>
        prev ? { ...prev, recoveryTutorialShown: true } : prev
      )
    }
  }, [])

  const handleRestore = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      const result = await restoreProfile(code)
      if (!result.success) {
        return { success: false, error: result.error }
      }
      // Store the restored player ID and reload
      try {
        localStorage.setItem('arkalon_daily_player_id', result.playerId!)
      } catch {
        return { success: false, error: 'Could not save to local storage' }
      }
      // Reload to show the restored profile
      router.refresh()
      return { success: true }
    },
    [router]
  )

  if (phase === 'loading') {
    return (
      <div className="flex min-h-dvh flex-col">
        <GameHeader />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-muted">Loading profile...</p>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (phase === 'no-player' || phase === 'error') {
    return (
      <div className="flex min-h-dvh flex-col">
        <GameHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
          <p className="text-sm text-text-muted">
            {phase === 'no-player'
              ? 'No profile found. Play a puzzle to create one.'
              : 'Could not load your profile.'}
          </p>
          <RecoveryCodeEntry onRestore={handleRestore} />
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <GameHeader />
      <main className="flex-1 overflow-y-auto">
        <h1 className="sr-only">Player Profile</h1>
        <ProfileView profile={profile!} stats={stats} />
        {/* Recovery code restore - below the main profile content */}
        <div className="mx-auto max-w-180 px-4 pb-24">
          <RecoveryCodeEntry onRestore={handleRestore} />
        </div>
      </main>
      {showTutorial && profile && (
        <RecoveryTutorialOverlay
          recoveryCode={profile.recoveryCode}
          onDismiss={handleTutorialDismiss}
        />
      )}
      <BottomNav />
    </div>
  )
}
