'use client'

import Link from 'next/link'
import { Home, Trophy, User } from 'lucide-react'
import { useActiveView } from '@/hooks/useActiveView'

interface NavItem {
  href: string
  label: string
  view: 'home' | 'leaderboard' | 'profile'
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    view: 'home',
    icon: <Home size={20} aria-hidden="true" />
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    view: 'leaderboard',
    icon: <Trophy size={20} aria-hidden="true" />
  },
  {
    href: '/profile',
    label: 'Profile',
    view: 'profile',
    icon: <User size={20} aria-hidden="true" />
  }
]

export function BottomNav() {
  const activeView = useActiveView()

  // Do not render bottom nav during active gameplay
  if (activeView === 'game') return null

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-surface-panel"
    >
      <ul className="mx-auto flex max-w-180 items-center justify-around">
        {NAV_ITEMS.map(({ href, label, view, icon }) => {
          const isActive = activeView === view
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex flex-col items-center gap-1 py-3 text-xs transition-colors focus-visible:outline focus-visible:outline-accent-recall',
                  isActive
                    ? 'text-text-primary'
                    : 'text-text-muted hover:text-text-primary'
                ].join(' ')}
              >
                {icon}
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
