import type { PuzzleCategory } from '@/types/puzzle'
import { CATEGORIES, CATEGORY_ORDER } from '@/constants/categories'
import { getScoreTierClass } from '@/lib/format'

interface SkillProfileProps {
  // averageScore per category; null means fewer than 3 submissions
  scores: Partial<Record<PuzzleCategory, number>>
}

export function SkillProfile({ scores }: SkillProfileProps) {
  const categoriesWithData = CATEGORY_ORDER.filter(
    (slug) => scores[slug] !== undefined
  )

    if (categoriesWithData.length === 0) {
      return (
        <p className="w-full text-center text-xs text-text-muted">
          Play at least 3 rounds in a category to see your skill profile.
        </p>
      )
    }

  // Sort by score descending for display
  const sorted = [...CATEGORY_ORDER]
    .filter((slug) => scores[slug] !== undefined)
    .sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))

  return (
    <div className="w-full rounded-xl border border-border-subtle bg-surface-panel p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-text-muted">
        Skill Profile
      </p>
      <div className="flex flex-col gap-3">
        {sorted.map((slug) => {
          const score = scores[slug] ?? 0
          const cat = CATEGORIES[slug]
          const tierClass = getScoreTierClass(score)
          return (
            <div key={slug} className="flex items-center gap-3">
              <span className="w-16 text-xs text-text-muted">
                {cat.displayName.toUpperCase()}
              </span>
              <div
                className="relative flex-1 overflow-hidden rounded-full bg-border-subtle"
                style={{ height: '6px' }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${score}%`,
                    backgroundColor: cat.accentColor
                  }}
                  role="progressbar"
                  aria-valuenow={score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${cat.displayName} average score`}
                />
              </div>
              <span
                className={`w-8 text-right font-mono text-sm font-bold ${tierClass}`}
              >
                {score}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
