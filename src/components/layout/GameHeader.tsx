'use client'

import Link from 'next/link'
import { SoundControlButton } from '@/components/ui/SoundControlButton'
import type { PuzzleCategory } from '@/types/puzzle'
import { CATEGORIES } from '@/constants/categories'

interface GameHeaderProps {
  category?: PuzzleCategory
  familyIndex?: number
}

export function GameHeader({ category, familyIndex }: GameHeaderProps) {
  const cat = category ? CATEGORIES[category] : null

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3">
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
