'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PuzzleCategory, PuzzleStatus } from '@/types/puzzle'
import { CATEGORIES } from '@/constants/categories'
import { getScoreTierClass } from '@/lib/format'

interface CategoryCardProps {
  category: PuzzleCategory
  status: PuzzleStatus
  score?: number
  streakDays: number
  yesterdayScore?: number
}

const STATUS_LABEL: Record<PuzzleStatus, string> = {
  available: 'PLAY',
  trial: 'TRY IT',
  solved: 'DONE',
  failed: 'FAILED'
}

export function CategoryCard({
  category,
  status,
  score,
  streakDays,
  yesterdayScore
}: CategoryCardProps) {
  const router = useRouter()
  const cat = CATEGORIES[category]

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
      aria-label={`${cat.displayName}: ${status}`}
      style={{
        borderLeftColor: cat.accentColor,
        borderColor: isPlayable ? `${cat.accentColor}55` : '#1c2738',
        background: isPlayable
          ? `linear-gradient(90deg, ${cat.accentColor}12 0%, #0f1622 40%, #0f1622 100%)`
          : '#0f1622',
        boxShadow: isPlayable ? `0 0 14px ${cat.accentColor}14` : 'none'
      }}
      className={[
        'w-full flex-1 min-h-13.5 max-h-24 flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border border-l-4 transition-all duration-150',
        isPlayable
          ? 'cursor-pointer hover:border-opacity-100 hover:translate-x-1 active:scale-[0.99] focus-visible:outline-2'
          : 'opacity-65 cursor-default'
      ].join(' ')}
    >
      {/* Left: Cartridge Icon & Details */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Category Icon Badge with Animated Galaxy Border */}
        <div
          className={`frame-${category} w-9 h-9 min-[360px]:w-10 min-[360px]:h-10 [@media(min-height:780px)]:w-12 [@media(min-height:780px)]:h-12 rounded-lg flex items-center justify-center text-lg [@media(min-height:780px)]:text-xl shrink-0 select-none transition-all`}
        >
          {cat.icon}
        </div>

        {/* Identity & Subtext with RPS League Tier Shaders */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs min-[360px]:text-sm font-black uppercase tracking-wider title-${category}`}
            >
              {cat.displayName}
            </span>
            {streakDays > 0 && (
              <span className="text-[10px] font-mono font-bold text-[#F59E0B] flex items-center gap-0.5">
                🔥{streakDays}d
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-text-muted truncate">
            {cat.description}
          </span>
          {/* Telemetry specs: automatically surfaces on tall viewports to fill space */}
          <span
            className="inline-block truncate whitespace-nowrap text-[10px] font-mono tracking-tight mt-0.5"
            style={{ color: `${cat.accentColor}99` }}
          >
            {cat.spec}
          </span>
        </div>
      </div>

      {/* Right: Action or Results */}
      <div className="flex items-center gap-2 shrink-0">
        {isCompleted && score !== undefined ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span
                className={`font-mono text-base font-black ${getScoreTierClass(score)}`}
              >
                {score}
              </span>
              <span className="text-[9px] font-bold text-text-muted uppercase">
                {status === 'solved' ? '✓ PASS' : '✗ FAIL'}
              </span>
            </div>
            {yesterdayScore !== undefined && (
              <Link
                href={`/review/${category}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-bold text-accent-recall underline underline-offset-2 px-1.5 py-1"
              >
                REV
              </Link>
            )}
          </div>
        ) : (
          <span
            className={`btn-${category} px-3.5 py-1.5 [@media(min-height:780px)]:px-4 [@media(min-height:780px)]:py-2 rounded-md text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95`}
          >
            <span className={`title-${category}`}>{STATUS_LABEL[status]}</span>
          </span>
        )}
      </div>
    </div>
  )
}
