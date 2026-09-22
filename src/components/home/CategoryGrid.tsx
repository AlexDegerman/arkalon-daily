import type { CategoryStatus } from '@/types/puzzle'
import { CATEGORY_ORDER } from '@/constants/categories'
import { CategoryCard } from './CategoryCard'

interface CategoryGridProps {
  statuses: CategoryStatus[]
}

export function CategoryGrid({ statuses }: CategoryGridProps) {
  const statusMap = Object.fromEntries(
    statuses.map((s) => [s.category, s])
  ) as Record<string, CategoryStatus>

  return (
    <section
      aria-label="Today's puzzles"
      className="flex flex-col gap-2 sm:gap-2.5 w-full my-1"
    >
      {CATEGORY_ORDER.map((slug) => {
        const s = statusMap[slug]
        if (!s) return null
        return (
          <CategoryCard
            key={slug}
            category={slug}
            status={s.status}
            score={s.score}
            streakDays={s.streakDays}
            yesterdayScore={s.yesterdayScore}
          />
        )
      })}
    </section>
  )
}
