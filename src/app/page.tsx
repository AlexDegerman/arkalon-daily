import { CategoryGrid } from '@/components/home/CategoryGrid'
import { HomepageClient } from '@/components/home/HomepageClient'
import type { CategoryStatus } from '@/types/puzzle'

// Static placeholder statuses - replaced with live data in Commit 3.5
const PLACEHOLDER_STATUSES: CategoryStatus[] = [
  {
    category: 'recall',
    status: 'available',
    streakDays: 7,
    trialCompleted: true
  },
  {
    category: 'surge',
    status: 'solved',
    streakDays: 3,
    trialCompleted: true,
    score: 84
  },
  { category: 'cipher', status: 'trial', streakDays: 0, trialCompleted: false },
  {
    category: 'strike',
    status: 'failed',
    streakDays: 1,
    trialCompleted: true,
    score: 61
  },
  {
    category: 'depths',
    status: 'available',
    streakDays: 12,
    trialCompleted: true
  }
]

export default function HomePage() {
  return (
    <>
      <HomepageClient />
      <main className="mx-auto max-w-180 px-4 py-6 pb-24">
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-widest text-text-primary">
          ARKALON DAILY
        </h1>
        <p className="mb-6 text-center text-sm text-text-muted">
          Today&apos;s Puzzles
        </p>
        <CategoryGrid statuses={PLACEHOLDER_STATUSES} />
      </main>
    </>
  )
}
