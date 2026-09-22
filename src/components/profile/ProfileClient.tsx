'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProfileView } from './ProfileView'
import { RecoveryTutorialOverlay } from './RecoveryTutorialOverlay'
import { getPlayerProfile } from '@/app/actions/getPlayerProfile'
import { markRecoveryTutorialShown } from '@/app/actions/markRecoveryTutorialShown'
import type { PlayerProfile, CategoryStats } from '@/types/puzzle'

type PagePhase = 'loading' | 'loaded' | 'error'

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
    const localId = getPlayerId()

    getPlayerProfile(localId).then((res) => {
      if (!res.success || !res.profile) {
        setPhase('error')
        return
      }

      // Sync resolved player ID to localStorage
      try {
        localStorage.setItem('arkalon_daily_player_id', res.profile.id)
      } catch {}

      setProfile(res.profile)
      setStats(res.stats ?? [])

      // Show tutorial overlay if the server says it hasn't been acknowledged yet
      if (!res.profile.recoveryTutorialShown) {
        setShowTutorial(true)
      }

      setPhase('loaded')
    })
  }, [])

  const handleTutorialDismiss = useCallback(async () => {
    setShowTutorial(false)
    const playerId = getPlayerId()
    if (playerId) {
      try {
        localStorage.setItem('arkalon_daily_recovery_tutorial_shown', 'true')
      } catch {}

      await markRecoveryTutorialShown(playerId)
      setProfile((prev) =>
        prev ? { ...prev, recoveryTutorialShown: true } : prev
      )
    }
  }, [])

  if (phase === 'loading') {
    return (
      <main className="flex flex-1 items-center justify-center py-16">
        <p className="text-xs font-mono text-text-muted animate-pulse">
          TRANSMITTING PROFILE DATA...
        </p>
      </main>
    )
  }

  if (phase === 'error') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-xs font-mono text-status-fail">
          Could not load your profile.
        </p>
        <button
          onClick={() => router.push('/')}
          className="rounded-lg border border-border-subtle bg-surface-panel px-4 py-2 text-xs font-mono text-text-primary hover:border-accent-recall transition-colors"
        >
          RETURN HOME
        </button>
      </main>
    )
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto">
        <h1 className="sr-only">Player Profile</h1>
        <ProfileView profile={profile!} stats={stats} />
      </main>

      {showTutorial && (
        <RecoveryTutorialOverlay onDismiss={handleTutorialDismiss} />
      )}
    </>
  )
}
