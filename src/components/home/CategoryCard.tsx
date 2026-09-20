'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PuzzleCategory, PuzzleStatus } from '@/types/puzzle'
import { CATEGORIES, CATEGORY_BORDER_MAP } from '@/constants/categories'

interface CategoryCardProps {
  category: PuzzleCategory
  status: PuzzleStatus
  score?: number
  streakDays: number
}

const STATUS_BADGE: Record<PuzzleStatus, string> = {
  available: 'PLAY',
  trial: 'TRY IT',
  solved: 'DONE',
  failed: 'FAILED'
}

const STATUS_BORDER: Record<PuzzleStatus, string> = {
  available: 'border-opacity-100',
  trial: 'border-dashed border-opacity-100',
  solved: 'border-opacity-40',
  failed: 'border-opacity-40'
}

const STATUS_PULSE: Record<PuzzleStatus, boolean> = {
  available: true,
  trial: true,
  solved: false,
  failed: false
}

function StreakBadge({ days }: { days: number }) {
  if (days < 1) return null
  return (
    <span className="text-xs text-text-muted">
      {'\uD83D\uDD25'} {days}-day streak
    </span>
  )
}

export function CategoryCard({
  category,
  status,
  score,
  streakDays
}: CategoryCardProps) {
  const router = useRouter()
  const cat = CATEGORIES[category]
  const borderClass = CATEGORY_BORDER_MAP[category]

  const isPlayable = status === 'available' || status === 'trial'
  const isCompleted = status === 'solved' || status === 'failed'

  const handleClick = useCallback(() => {
    if (!isPlayable) return
    router.push(`/${category}`)
  }, [isPlayable, category, router])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && isPlayable) {
        e.preventDefault()
        router.push(`/${category}`)
      }
    },
    [isPlayable, category, router]
  )

  return (
    <div
      role={isPlayable ? 'button' : 'article'}
      tabIndex={isPlayable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={
        isPlayable
          ? `Play ${cat.displayName}`
          : `${cat.displayName} - ${isCompleted && score !== undefined ? `Score: ${score}` : status}`
      }
      className={[
        'relative flex flex-col gap-2 rounded-xl border-2 bg-surface-panel p-4 transition-opacity',
        borderClass,
        STATUS_BORDER[status],
        isPlayable
          ? 'cursor-pointer hover:opacity-80 focus-visible:outline focus-visible:outline-offset-2'
          : 'cursor-default',
        isCompleted ? 'opacity-60' : '',
        STATUS_PULSE[status] ? 'animate-pulse-subtle' : ''
      ].join(' ')}
    >
      {/* Category identity */}
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none" aria-hidden="true">
          {cat.icon}
        </span>
        <span className="text-sm font-semibold tracking-widest text-text-primary">
          {cat.displayName.toUpperCase()}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-text-muted">{cat.description}</p>

      {/* Score display for completed categories */}
      {isCompleted && score !== undefined && (
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-text-primary">
            {score}
          </span>
          <span
            className={
              status === 'solved' ? 'text-status-success' : 'text-status-fail'
            }
            aria-label={status === 'solved' ? 'Solved' : 'Failed'}
          >
            {status === 'solved' ? '\u2713' : '\u2717'}
          </span>
        </div>
      )}

      {/* Streak */}
      <StreakBadge days={streakDays} />

      {/* Action badge */}
      {isPlayable && (
        <div className="mt-1">
          <span
            className="inline-block rounded border px-3 py-1 text-xs font-semibold tracking-wider"
            style={{
              backgroundColor: `${cat.accentColor}18`,
              color: cat.accentColor,
              borderColor: `${cat.accentColor}66`
            }}
          >
            [ {STATUS_BADGE[status]} ]
          </span>
        </div>
      )}
    </div>
  )
}
