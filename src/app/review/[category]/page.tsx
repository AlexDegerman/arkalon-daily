import { notFound } from 'next/navigation'
import { CATEGORY_ORDER } from '@/constants/categories'
import { YesterdayReview } from '@/components/review/YesterdayReview'
import type { PuzzleCategory } from '@/types/puzzle'

interface ReviewPageProps {
  params: Promise<{ category: string }>
}

export function generateStaticParams() {
  return CATEGORY_ORDER.map((slug) => ({ category: slug }))
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { category } = await params
  const slug = category as PuzzleCategory
  if (!CATEGORY_ORDER.includes(slug)) notFound()
  return (
    <main className="flex-1 overflow-y-auto">
      <YesterdayReview category={slug} />
    </main>
  )
}
