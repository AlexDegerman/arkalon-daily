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

  // First four in a 2-column grid, fifth centered below
  const first4 = CATEGORY_ORDER.slice(0, 4)
  const fifth = CATEGORY_ORDER[4]

  return (
    <section aria-label="Today's puzzles">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {first4.map((slug) => {
          const s = statusMap[slug]
          if (!s) return null
          return (
            <CategoryCard
              key={slug}
              category={slug}
              status={s.status}
              score={s.score}
              streakDays={s.streakDays}
            />
          )
        })}
      </div>

      {/* Fifth card centered */}
      {statusMap[fifth] && (
        <div className="mt-3 flex justify-center">
          <div className="w-full sm:w-1/2">
            <CategoryCard
              category={fifth}
              status={statusMap[fifth].status}
              score={statusMap[fifth].score}
              streakDays={statusMap[fifth].streakDays}
            />
          </div>
        </div>
      )}
    </section>
  )
}
