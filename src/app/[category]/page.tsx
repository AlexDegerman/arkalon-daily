import { notFound } from 'next/navigation'
import { CATEGORY_ORDER } from '@/constants/categories'
import type { PuzzleCategory } from '@/types/puzzle'
import { GameHeader } from '@/components/layout/GameHeader'

interface CategoryPageProps {
  params: { category: string }
}

export function generateStaticParams() {
  return CATEGORY_ORDER.map((slug) => ({ category: slug }))
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const slug = params.category as PuzzleCategory

  if (!CATEGORY_ORDER.includes(slug)) {
    notFound()
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <GameHeader category={slug} />
      <main className="mx-auto flex w-full max-w-180 flex-1 flex-col px-4 py-4">
        {/* Puzzle surface mounted here in Commit 3.5 */}
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-muted">Loading puzzle...</p>
        </div>
      </main>
    </div>
  )
}
