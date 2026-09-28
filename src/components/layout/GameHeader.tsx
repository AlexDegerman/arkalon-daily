'use client'

import Link from 'next/link'
import { HelpCircle } from 'lucide-react'
import { SoundControlButton } from '@/components/ui/SoundControlButton'
import type { PuzzleCategory } from '@/types/puzzle'
import { CATEGORIES } from '@/constants/categories'

interface GameHeaderProps {
  category?: PuzzleCategory
  familyIndex?: number
  onOpenBriefing?: () => void
}

export function GameHeader({
  category,
  familyIndex,
  onOpenBriefing
}: GameHeaderProps) {
  const cat = category ? CATEGORIES[category] : null

  return (
    <>
      <header className="mx-auto flex w-full max-w-180 items-center justify-between px-2.5 sm:px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold tracking-widest select-none"
        >
          <img
            src="/brand/arkalon-daily-emblem.svg"
            alt="Arkalon Daily"
            width={16}
            height={16}
            className="w-4 h-4 shrink-0 select-none"
          />
          <span className="title-daily">ARKALON DAILY</span>
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
          {onOpenBriefing && (
            <button
              type="button"
              onClick={onOpenBriefing}
              title="Review Rules & Modifiers"
              aria-label="Review Rules & Modifiers"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <HelpCircle size={18} />
            </button>
          )}
          <SoundControlButton />
        </div>
      </header>

      {familyIndex !== undefined && (
        <div className="flex justify-center pb-1">
          <span className="text-xs text-text-muted">
            Challenge
            <span className="ml-1 opacity-60">#{familyIndex}</span>
          </span>
        </div>
      )}
    </>
  )
}