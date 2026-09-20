'use client'

import { useEffect, useCallback } from 'react'
import { useUiStore } from '@/app/stores/uiStore'
import { useSound } from '@/hooks/useSound'
import { speakArkalon } from '@/lib/arkalonTTS'
import type { PuzzleCategory } from '@/types/puzzle'
import { CATEGORIES } from '@/constants/categories'
import type { SoundKey } from '@/hooks/useSound'

interface StreakMilestoneOverlayProps {
  category: PuzzleCategory
  milestone: number // 7 | 30 | 100 | 365
  streakDays: number
  onDismiss: () => void
  showRecoveryPrompt?: boolean // true if player hasn't visited profile yet
}

const MILESTONE_RARITY: Record<number, string> = {
  7: 'rare',
  30: 'legendary',
  100: 'mythical',
  365: 'rainbow'
}

const MILESTONE_SOUND: Record<number, SoundKey> = {
  7: 'streak-7',
  30: 'streak-30',
  100: 'streak-100',
  365: 'streak-365'
}

const MILESTONE_TTS: Record<number, string> = {
  7: 'Seven cycles... unbroken.',
  30: 'Thirty cycles... your persistence... is noted.',
  100: 'One hundred cycles... remarkable... endurance.',
  365: 'A full revolution... around the star. Extraordinary.'
}

const MILESTONE_LABEL: Record<number, string> = {
  7: '7-DAY STREAK',
  30: '30-DAY STREAK',
  100: '100-DAY STREAK',
  365: '365-DAY STREAK'
}

// Rarity border color per milestone
const RARITY_BORDER: Record<string, string> = {
  rare: 'border-[#3B82F6]',
  legendary: 'border-[#F59E0B]',
  mythical: 'border-[#EF4444]',
  rainbow: 'border-[#a78bfa]'
}

const RARITY_GLOW: Record<string, string> = {
  rare: 'shadow-[0_0_24px_rgba(59,130,246,0.4)]',
  legendary: 'shadow-[0_0_24px_rgba(245,158,11,0.4)]',
  mythical: 'shadow-[0_0_32px_rgba(239,68,68,0.5)]',
  rainbow: 'shadow-[0_0_32px_rgba(167,139,250,0.6)]'
}

export function StreakMilestoneOverlay({
  category,
  milestone,
  streakDays,
  onDismiss,
  showRecoveryPrompt = false
}: StreakMilestoneOverlayProps) {
  const { play } = useSound()
  const arkalonTTSEnabled = useUiStore((s) => s.arkalonTTSEnabled)
  const arkalonVolume = useUiStore((s) => s.arkalonVolume)

  const cat = CATEGORIES[category]
  const rarity = MILESTONE_RARITY[milestone] ?? 'rare'
  const borderClass = RARITY_BORDER[rarity] ?? 'border-border-subtle'
  const glowClass = RARITY_GLOW[rarity] ?? ''

  useEffect(() => {
    const soundKey = MILESTONE_SOUND[milestone]
    if (soundKey) play(soundKey)

    if (arkalonTTSEnabled) {
      const line = MILESTONE_TTS[milestone]
      if (line) {
        setTimeout(() => speakArkalon(line, arkalonVolume), 600)
      }
    }
  }, [milestone, play, arkalonTTSEnabled, arkalonVolume])

  // Dismiss on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-title"
    >
      <div
        className={[
          'w-full max-w-sm rounded-xl border-2 bg-surface-panel p-6 text-center',
          borderClass,
          glowClass
        ].join(' ')}
      >
        {/* Category icon + streak flame */}
        <div className="mb-3 flex items-center justify-center gap-3">
          <span className="text-3xl" aria-hidden="true">
            {cat.icon}
          </span>
          <span className="text-4xl" aria-hidden="true">
            {'\uD83D\uDD25'}
          </span>
        </div>

        {/* Milestone badge */}
        <p
          className="mb-1 font-mono text-sm font-bold tracking-widest"
          style={{ color: cat.accentColor }}
        >
          {MILESTONE_LABEL[milestone]}
        </p>

        {/* Category name */}
        <h2
          id="milestone-title"
          className="mb-2 text-xl font-semibold text-text-primary"
        >
          {cat.displayName}
        </h2>

        {/* Streak count */}
        <p className="mb-5 text-sm text-text-muted">
          {streakDays} consecutive {streakDays === 1 ? 'day' : 'days'}
        </p>

        {/* Recovery prompt */}
        {showRecoveryPrompt && (
          <div className="mb-4 rounded-lg border border-border-subtle bg-bg-base px-4 py-3">
            <p className="text-xs text-text-muted">
              {'\uD83D\uDC40'} You&apos;re building a streak! Visit your profile
              to save your recovery code so you don&apos;t lose it.
            </p>
          </div>
        )}

        <button
          onClick={onDismiss}
          autoFocus
          className="w-full rounded-lg border border-border-subtle px-4 py-3 text-xs font-semibold tracking-wider text-text-muted transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-accent-recall"
        >
          CONTINUE
        </button>
        <p className="mt-2 text-xs text-text-muted">or press Escape</p>
      </div>
    </div>
  )
}
