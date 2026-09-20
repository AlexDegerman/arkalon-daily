import { notFound } from 'next/navigation'
import { CATEGORY_ORDER } from '@/constants/categories'
import { YesterdayReview } from '@/components/review/YesterdayReview'
import type { PuzzleCategory } from '@/types/puzzle'

interface ReviewPageProps {
  params: { category: string }
}

export function generateStaticParams() {
  return CATEGORY_ORDER.map((slug) => ({ category: slug }))
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const slug = params.category as PuzzleCategory
  if (!CATEGORY_ORDER.includes(slug)) notFound()

  return (
    <main className="flex-1 overflow-y-auto">
      <YesterdayReview category={slug} />
    </main>
  )
}
