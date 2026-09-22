'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import { Dices } from 'lucide-react'
import { useUiStore } from '@/app/stores/uiStore'
import { UPDATES_VERSION } from '@/lib/updates'
import { CATEGORY_ORDER, CATEGORIES } from '@/constants/categories'
import { getOrCreateDailyPlayer } from '@/app/actions/getOrCreateDailyPlayer'
import { rerollPlayerName } from '@/app/actions/rerollPlayerName'

export function WelcomeModal() {
  const setShowWelcomeModal = useUiStore((s) => s.setShowWelcomeModal)
  const setShowUpdateModal = useUiStore((s) => s.setShowUpdateModal)
  const showWelcomeModal = useUiStore((s) => s.showWelcomeModal)

  const [displayName, setDisplayName] = useState<string>('Loading...')
  const [justRerolled, setJustRerolled] = useState(false)
  const [isRerolling, startReroll] = useTransition()

  useEffect(() => {
    getOrCreateDailyPlayer().then(({ coreId, displayName }) => {
      localStorage.setItem('arkalon_daily_player_id', coreId)
      setDisplayName(displayName)
      const storedVersion = localStorage.getItem('arkalon_daily_version')
      if (!storedVersion) {
        setShowWelcomeModal(true)
      } else if (storedVersion !== UPDATES_VERSION) {
        setShowUpdateModal(true)
      }
    })
  }, [setShowWelcomeModal, setShowUpdateModal])

  const handleReroll = () => {
    if (isRerolling) return
    startReroll(async () => {
      const res = await rerollPlayerName()
      if (res.success && res.nickname) {
        setDisplayName(res.nickname)
        setJustRerolled(true)
        setTimeout(() => setJustRerolled(false), 800)
      }
    })
  }

  const handleDismiss = useCallback(() => {
    localStorage.setItem('arkalon_daily_version', UPDATES_VERSION)
    setShowWelcomeModal(false)
  }, [setShowWelcomeModal])

  if (!showWelcomeModal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm rounded-xl border border-border-subtle bg-surface-panel shadow-2xl overflow-hidden animate-[fade-in_0.2s_ease-out_both]">
        {/* Top Accent Stripe */}
        <div className="h-1 w-full bg-accent-recall" />

        <div className="px-5 py-6 sm:px-6 sm:py-6 flex flex-col items-center text-center gap-4">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
              WELCOME TO
            </p>
            <h2 className="text-2xl font-black tracking-widest title-daily select-none">
              ARKALON DAILY
            </h2>
            <p className="text-[11px] text-text-muted font-medium">
              Five daily puzzles. Your choice. Your streak.
            </p>
          </div>

          {/* Core Identity Card */}
          <div className="w-full">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1.5 text-left">
              YOUR CORE IDENTITY
            </p>

            <div
              className="w-full rounded-lg border px-3.5 py-2.5 flex items-center justify-between gap-2.5 transition-all duration-200"
              style={{
                backgroundColor: justRerolled
                  ? 'rgba(57, 255, 138, 0.12)'
                  : '#0a0e14',
                borderColor: justRerolled ? '#39ff8a' : '#22303f'
              }}
            >
              {/* Dynamic Font Scaling: prevents truncation at 320px */}
              <span
                className="flex-1 whitespace-nowrap tracking-tight font-bold leading-snug text-left font-mono"
                style={{
                  fontSize:
                    displayName.length > 18
                      ? '11px'
                      : displayName.length > 13
                        ? '13px'
                        : '15px',
                  color: '#39ff8a'
                }}
              >
                {isRerolling ? '...' : displayName}
              </span>

              <button
                type="button"
                onClick={handleReroll}
                disabled={isRerolling || displayName === 'Loading...'}
                title="Reroll procedural nickname"
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-border-subtle bg-surface-panel text-text-muted hover:border-accent-recall hover:text-accent-recall cursor-pointer transition-all disabled:opacity-50"
              >
                <Dices
                  size={12}
                  className={isRerolling ? 'animate-spin' : ''}
                />
                <span>REROLL</span>
              </button>
            </div>

            <p className="mt-1.5 text-[10px] leading-relaxed text-text-muted text-left">
              Shared across the Arkalon Network. Reroll anytime in Profile.
            </p>
          </div>

          {/* 5-Pillar Discipline Showcase (Replaces verbose em-dash bullet list) */}
          <div className="w-full">
            <div className="grid grid-cols-5 gap-1.5 w-full">
              {CATEGORY_ORDER.map((slug) => {
                const cat = CATEGORIES[slug]
                return (
                  <div
                    key={slug}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border-subtle bg-bg-base py-2 px-1 text-center"
                  >
                    <span className="text-base leading-none" aria-hidden="true">
                      {cat.icon}
                    </span>
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider leading-none"
                      style={{ color: cat.accentColor }}
                    >
                      {cat.displayName}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[10px] text-text-muted">
              One attempt per puzzle each day. Resets at 00:00 UTC.
            </p>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-150 active:scale-[0.98] cursor-pointer bg-accent-recall text-bg-base hover:opacity-90 font-mono shadow-[0_0_15px_rgba(57,255,138,0.25)]"
          >
            ENTER ARKALON DAILY
          </button>

          {/* Security Subtext */}
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-medium leading-snug text-center text-text-muted">
              Your session is secured on this device.
            </p>
            <p className="text-[10px] font-medium leading-snug text-center text-text-muted">
              Save your recovery code on the Network Hub to protect your
              streaks.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
