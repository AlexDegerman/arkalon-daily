'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUiStore } from '@/app/stores/uiStore'
import { CURRENT_VERSION } from '@/lib/updates'
import { CATEGORY_ORDER } from '@/constants/categories'
import { CATEGORIES } from '@/constants/categories'
import { createProfile } from '@/app/actions/createProfile'

// Shown once when no arkalon_daily_player_id exists in localStorage.
// Dismiss triggers profile creation (wired in Commit 4.2).
export function WelcomeModal() {
  const setActiveModal = useUiStore((s) => s.setActiveModal)
  const activeModal = useUiStore((s) => s.activeModal)
  const [visible, setVisible] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const playerId = localStorage.getItem('arkalon_daily_player_id')
    if (!playerId) {
      setActiveModal('welcome')
      setVisible(true)
    } else {
      // Check for version update
      const storedVersion = localStorage.getItem('arkalon_daily_version')
      if (storedVersion && storedVersion !== CURRENT_VERSION) {
        setActiveModal('update')
      }
    }
  }, [setActiveModal])

  const handleDismiss = useCallback(async () => {
    setCreating(true)
    try {
      // Only create a profile if one does not already exist
      const existingId = localStorage.getItem('arkalon_daily_player_id')
      if (!existingId) {
        const result = await createProfile()
        if (result.success && result.playerId) {
          localStorage.setItem('arkalon_daily_player_id', result.playerId)
          if (result.displayName) {
            localStorage.setItem(
              'arkalon_daily_display_name',
              result.displayName
            )
          }
        }
        // If profile creation fails, the modal still closes - the player
        // will be redirected to home and the modal will show again next visit.
      }
      localStorage.setItem('arkalon_daily_version', CURRENT_VERSION)
    } finally {
      setCreating(false)
      setActiveModal(null)
      setVisible(false)
    }
  }, [setActiveModal])

  if (!visible || activeModal !== 'welcome') return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-panel p-6">
        <h2
          id="welcome-title"
          className="mb-1 text-center text-xl font-semibold tracking-widest text-text-primary"
        >
          ARKALON DAILY
        </h2>
        <p className="mb-5 text-center text-sm text-text-muted">
          Five daily puzzles. Your choice. Your streak.
        </p>

        <ul className="mb-6 space-y-2">
          {CATEGORY_ORDER.map((slug) => {
            const cat = CATEGORIES[slug]
            return (
              <li key={slug} className="flex items-center gap-3 text-sm">
                <span className="text-lg leading-none">{cat.icon}</span>
                <span className="font-medium text-text-primary">
                  {cat.displayName}
                </span>
                <span className="text-text-muted">
                  &mdash; {cat.description}
                </span>
              </li>
            )
          })}
        </ul>

        <p className="mb-5 text-center text-xs text-text-muted">
          One attempt per puzzle per day. Your progress is saved automatically.
        </p>

        <button
          onClick={handleDismiss}
          disabled={creating}
          aria-busy={creating}
          className="w-full rounded-lg bg-accent-recall px-4 py-3 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          {creating ? 'Setting up...' : 'BEGIN'}
        </button>
      </div>
    </div>
  )
}
