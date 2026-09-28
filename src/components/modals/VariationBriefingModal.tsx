'use client'

import { useState } from 'react'
import type { PuzzleCategory } from '@/types/puzzle'
import { CATEGORIES } from '@/constants/categories'

export interface BriefingInfo {
  modifierKey: string
  title: string
  bullets: string[]
}

interface VariationBriefingModalProps {
  category: PuzzleCategory
  briefing: BriefingInfo
  onDismiss: (neverShowAgain: boolean) => void
  isManual?: boolean
}

export function VariationBriefingModal({
  category,
  briefing,
  onDismiss,
  isManual = false
}: VariationBriefingModalProps) {
  const [neverShowAgain, setNeverShowAgain] = useState(false)
  const cat = CATEGORIES[category]

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-bg-base/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-panel p-6 shadow-2xl animate-[fade-in_0.15s_ease-out_both]">
        {/* Category Identity */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            {cat.icon}
          </span>
          <div>
            <p
              id="briefing-title"
              className="text-xs font-mono font-black uppercase tracking-widest"
              style={{ color: cat.accentColor }}
            >
              {cat.displayName} &middot; VARIATION
            </p>
            <h2 className="text-sm font-bold text-text-primary">
              {briefing.title}
            </h2>
          </div>
        </div>

        {/* Bullets */}
        <ul className="mb-5 flex flex-col gap-2.5">
          {briefing.bullets.map((bullet, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs leading-relaxed text-text-primary"
            >
              <span className="mt-0.5 shrink-0 text-accent-recall font-mono font-bold">
                &bull;
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Don't show again checkbox (suppressed during manual (?) review) */}
        {!isManual && (
          <label className="mb-5 flex items-center gap-2 text-[11px] text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={neverShowAgain}
              onChange={(e) => setNeverShowAgain(e.target.checked)}
              className="rounded border-border-subtle bg-bg-base text-accent-recall accent-accent-recall cursor-pointer"
            />
            <span>Don&apos;t show tips for this variation again</span>
          </label>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={() => onDismiss(neverShowAgain)}
          autoFocus
          className="w-full rounded-lg py-2.5 text-xs font-black uppercase tracking-wider text-bg-base transition-opacity hover:opacity-90 font-mono cursor-pointer"
          style={{ backgroundColor: cat.accentColor }}
        >
          {isManual ? '[ CLOSE ]' : '[ CONTINUE ]'}
        </button>
      </div>
    </div>
  )
}