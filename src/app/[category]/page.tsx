import { notFound } from 'next/navigation'
import { CATEGORY_ORDER } from '@/constants/categories'
import type { PuzzleCategory } from '@/types/puzzle'
import { CategorySurface } from '@/components/puzzles/CategorySurface'

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

  // CategorySurface is a client component that handles player ID retrieval,
  // challenge loading, trial flow, puzzle rendering, and result submission.
  return <CategorySurface category={slug} />
}
