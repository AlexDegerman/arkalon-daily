import { notFound } from 'next/navigation'
import { CATEGORY_ORDER } from '@/constants/categories'
import { GameHeader } from '@/components/layout/GameHeader'
import { BottomNav } from '@/components/layout/BottomNav'
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
    <div className="flex min-h-dvh flex-col">
      <GameHeader />
      <main className="flex-1 overflow-y-auto">
        <YesterdayReview category={slug} />
      </main>
      <BottomNav />
    </div>
  )
}
