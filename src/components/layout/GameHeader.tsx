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
  maxWidthClass?: string
}

const CATEGORY_HEADER_MAX_WIDTH: Record<PuzzleCategory, string> = {
  depths: 'max-w-[440px]',
  recall: 'max-w-lg',
  cipher: 'max-w-lg',
  strike: 'max-w-[620px]',
  surge: 'max-w-[620px]'
}

export function GameHeader({
  category,
  familyIndex,
  onOpenBriefing,
  maxWidthClass
}: GameHeaderProps) {
  const cat = category ? CATEGORIES[category] : null
  const widthClass =
    maxWidthClass ??
    (category ? CATEGORY_HEADER_MAX_WIDTH[category] : 'max-w-180')

  return (
    <>
      <header
        className={`mx-auto flex w-full ${widthClass} items-center justify-between px-2.5 sm:px-4 py-2.5 sm:py-3.5`}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-black tracking-wider select-none shrink-0"
        >
          <img
            src="/brand/arkalon-daily-emblem.svg"
            alt="Arkalon Daily"
            width={20}
            height={20}
            className="w-5 h-5 sm:w-5.5 sm:h-5.5 shrink-0 select-none"
          />
          <span className="text-[#00ff66] font-black tracking-wider [-webkit-text-stroke:0.5px_#003311] drop-shadow-[0_0_3px_rgba(0,255,102,0.4)]">
            ARKALON DAILY
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {cat && (
            <span
              className="text-xs sm:text-sm font-black tracking-widest uppercase"
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
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <HelpCircle size={18} />
            </button>
          )}
          <SoundControlButton />
        </div>
      </header>

      {familyIndex !== undefined && (
        <div
          className={`mx-auto flex w-full ${widthClass} justify-center pb-1 px-2.5 sm:px-4`}
        >
          <span className="text-xs sm:text-sm font-mono font-medium text-text-muted">
            Challenge
            <span className="ml-1 text-text-primary font-bold">
              #{familyIndex}
            </span>
          </span>
        </div>
      )}
    </>
  )
}