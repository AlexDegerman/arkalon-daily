'use client'

import { useState } from 'react'
import type { CategoryStats, PuzzleCategory } from '@/types/puzzle'
import { CATEGORIES, CATEGORY_ORDER } from '@/constants/categories'

interface CategoryStatsPanelProps {
  stats: CategoryStats[]
}

interface StatRowProps {
  label: string
  value: string | number
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="font-mono text-sm font-medium text-text-primary">
        {value}
      </span>
    </div>
  )
}

export function CategoryStatsPanel({ stats }: CategoryStatsPanelProps) {
  const [activeTab, setActiveTab] = useState<PuzzleCategory>(CATEGORY_ORDER[0])

  const statsMap = Object.fromEntries(
    stats.map((s) => [s.category, s])
  ) as Partial<Record<PuzzleCategory, CategoryStats>>

  const activeStats = statsMap[activeTab]

  return (
    <div className="w-full rounded-xl border border-border-subtle bg-surface-panel">
      {/* Tab row */}
      <div
        className="flex border-b border-border-subtle"
        role="tablist"
        aria-label="Category statistics"
      >
        {CATEGORY_ORDER.map((slug) => {
          const cat = CATEGORIES[slug]
          const isActive = activeTab === slug
          return (
            <button
              key={slug}
              role="tab"
              aria-selected={isActive}
              aria-controls={`stats-panel-${slug}`}
              id={`stats-tab-${slug}`}
              onClick={() => setActiveTab(slug)}
              className={[
                'flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent-recall',
                isActive
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              ].join(' ')}
              style={
                isActive
                  ? { borderBottom: `2px solid ${cat.accentColor}` }
                  : undefined
              }
            >
              <span aria-hidden="true">{cat.icon}</span>
              <span className="hidden sm:inline">{cat.displayName}</span>
            </button>
          )
        })}
      </div>

      {/* Stats content */}
      <div
        id={`stats-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`stats-tab-${activeTab}`}
        className="divide-y divide-border-subtle p-4"
      >
        {activeStats ? (
          <>
            <StatRow label="Best Score" value={activeStats.bestScore} />
            <StatRow
              label="Average Score"
              value={
                activeStats.daysPlayed >= 3 ? activeStats.averageScore : '-'
              }
            />
            <StatRow label="Days Played" value={activeStats.daysPlayed} />
            <StatRow
              label="Current Streak"
              value={
                activeStats.currentStreak === 1
                  ? '1 day'
                  : `${activeStats.currentStreak} days`
              }
            />
            <StatRow
              label="Longest Streak"
              value={
                activeStats.longestStreak === 1
                  ? '1 day'
                  : `${activeStats.longestStreak} days`
              }
            />
            {activeStats.globalPercentile !== null && (
              <StatRow
                label="Global Percentile"
                value={`Top ${activeStats.globalPercentile.toFixed(1)}%`}
              />
            )}
          </>
        ) : (
          <p className="py-2 text-xs text-text-muted">
            No {CATEGORIES[activeTab].displayName} results yet. Play
            today&apos;s puzzle to start.
          </p>
        )}
      </div>
    </div>
  )
}
