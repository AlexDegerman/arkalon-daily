'use client'

import Link from 'next/link'
import type { CategoryStatus, PuzzleCategory } from '@/types/puzzle'
import { CATEGORIES, CATEGORY_ORDER } from '@/constants/categories'

interface ContinuationPanelProps {
  currentCategory: PuzzleCategory
  allStatuses: CategoryStatus[]
}

// Shows remaining categories that still have today's attempt available.
// Does not frame them as obligations - framed as optional extension.
export function ContinuationPanel({
  currentCategory,
  allStatuses
}: ContinuationPanelProps) {
  const remaining = CATEGORY_ORDER.filter((slug) => {
    if (slug === currentCategory) return false
    const s = allStatuses.find((st) => st.category === slug)
    return s?.status === 'available' || s?.status === 'trial'
  })

  const allComplete = CATEGORY_ORDER.every((slug) => {
    const s = allStatuses.find((st) => st.category === slug)
    return s?.status === 'solved' || s?.status === 'failed'
  })

  if (allComplete) {
    return (
      <div className="w-full rounded-xl border border-border-subtle bg-surface-panel p-4 text-center">
        <p className="text-sm font-semibold text-text-primary">
          ALL DAILY PUZZLES COMPLETE
        </p>
        <p className="mt-1 text-xs text-text-muted">Come back tomorrow.</p>
      </div>
    )
  }

  if (remaining.length === 0) return null

  return (
    <div className="w-full">
      <p className="mb-3 text-xs uppercase tracking-wider text-text-muted">
        Try Another Puzzle
      </p>
      <div className="flex flex-col gap-2">
        {remaining.map((slug) => {
          const cat = CATEGORIES[slug]
          const s = allStatuses.find((st) => st.category === slug)
          const label = s?.status === 'trial' ? 'TRY IT' : 'PLAY'
          return (
            <Link
              key={slug}
              href={`/${slug}`}
              className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-panel px-4 py-3 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-accent-recall"
            >
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <span aria-hidden="true">{cat.icon}</span>
                {cat.displayName}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: cat.accentColor }}
              >
                [ {label} ]
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
