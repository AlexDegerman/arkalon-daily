'use client'

import { useEffect, useState } from 'react'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { getCategoryStatuses } from '@/app/actions/getCategoryStatuses'
import { CATEGORY_ORDER } from '@/constants/categories'
import type { CategoryStatus } from '@/types/puzzle'

// Default statuses shown while loading (all categories appear available)
const LOADING_STATUSES: CategoryStatus[] = CATEGORY_ORDER.map((slug) => ({
  category: slug,
  status: 'available',
  streakDays: 0,
  trialCompleted: false
}))

function getPlayerId(): string | null {
  try {
    return localStorage.getItem('arkalon_daily_player_id')
  } catch {
    return null
  }
}

export function HomeContent() {
  const [statuses, setStatuses] = useState<CategoryStatus[]>(LOADING_STATUSES)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const playerId = getPlayerId()
    if (!playerId) {
      // No player yet - WelcomeModal (in ClientShell) handles creation
      setLoaded(true)
      return
    }
    getCategoryStatuses(playerId).then((res) => {
      if (res.success && res.statuses) {
        setStatuses(res.statuses)
      }
      setLoaded(true)
    })
  }, [])

  return (
    <main className="mx-auto max-w-180 px-4 py-6 pb-24">
      <h1 className="mb-1 text-center text-2xl font-semibold tracking-widest text-text-primary">
        ARKALON DAILY
      </h1>
      <p className="mb-6 text-center text-sm text-text-muted">
        Today&apos;s Puzzles
      </p>
      <CategoryGrid statuses={statuses} />
    </main>
  )
}
