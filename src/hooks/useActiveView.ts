'use client'

import { usePathname } from 'next/navigation'

export type ActiveView = 'home' | 'leaderboard' | 'profile' | 'game'

export function useActiveView(): ActiveView {
  const pathname = usePathname()
  if (pathname === '/') return 'home'
  if (pathname === '/leaderboard') return 'leaderboard'
  if (pathname === '/profile') return 'profile'
  return 'game'
}
