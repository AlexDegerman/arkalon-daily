'use client'

import Link from 'next/link'
import { SoundControlButton } from '@/components/ui/SoundControlButton'
import type { PuzzleCategory } from '@/types/puzzle'
import { CATEGORIES } from '@/constants/categories'

interface GameHeaderProps {
  category?: PuzzleCategory
  familyName?: string
  familyIndex?: number
  showPause?: boolean
  onPause?: () => void
  isPaused?: boolean
}

export function GameHeader({
  category,
  familyName,
  familyIndex,
  showPause = false,
  onPause,
  isPaused = false
}: GameHeaderProps) {
  const cat = category ? CATEGORIES[category] : null

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-xs font-semibold tracking-widest text-text-muted transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          ARKALON DAILY
        </Link>

        <div className="flex items-center gap-2">
          {cat && (
            <span
              className="text-xs font-semibold tracking-widest"
              style={{ color: cat.accentColor }}
            >
              {cat.displayName.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <SoundControlButton />
          {showPause && onPause && (
            <button
              onClick={onPause}
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent-recall"
            >
              {isPaused ? (
                // Resume triangle
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <polygon points="3,2 13,8 3,14" />
                </svg>
              ) : (
                // Pause bars
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="3" y="2" width="4" height="12" />
                  <rect x="9" y="2" width="4" height="12" />
                </svg>
              )}
            </button>
          )}
        </div>
      </header>
      
      {(familyName || familyIndex !== undefined) && (
        <div className="flex justify-center pb-1">
          <span className="text-xs text-text-muted">
            {familyName}
            {familyIndex !== undefined && (
              <span className="ml-1 opacity-60">#{familyIndex}</span>
            )}
          </span>
        </div>
      )}
    </>
  )
}
