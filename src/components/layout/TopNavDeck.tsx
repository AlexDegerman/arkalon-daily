'use client'

import Link from 'next/link'
import { FileText, Trophy, User, Gamepad2 } from 'lucide-react'
import { SoundControlButton } from '@/components/ui/SoundControlButton'
import { useActiveView } from '@/hooks/useActiveView'

export function TopNavDeck() {
  const activeView = useActiveView()

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-bg-base/90 border-b border-border-subtle/50 px-3 sm:px-4 pt-3 pb-2.5">
      <div className="mx-auto w-full max-w-lg lg:max-w-5xl xl:max-w-6xl flex flex-col">
        {/* Top Header Deck: Centered Title Above Both Boxes + Right-Aligned Controls */}
        <div className="w-full relative flex items-center justify-between lg:justify-center mb-2.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-[19px] min-[360px]:text-[21px] sm:text-2xl lg:text-3xl font-black tracking-wider sm:tracking-widest select-none whitespace-nowrap text-center"
          >
            <img
              src="/brand/arkalon-daily-emblem.svg"
              alt="Arkalon Daily"
              width={28}
              height={28}
              className="w-5 h-5 min-[360px]:w-6 min-[360px]:h-6 sm:w-7 sm:h-7 shrink-0 select-none"
            />
            <span className="title-daily">ARKALON DAILY</span>
          </Link>

          <div className="flex items-center gap-1.5 lg:absolute lg:right-0 shrink-0">
            <Link
              href="/updates"
              title="Patch Notes & Updates"
              className="flex h-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-panel px-2.5 text-text-muted hover:text-text-primary hover:border-accent-recall transition-colors text-xs font-bold gap-1.5"
            >
              <FileText size={14} className="shrink-0" />
              <span className="hidden min-[380px]:inline text-[11px] font-mono tracking-wider">
                UPDATES
              </span>
            </Link>
            <SoundControlButton />
          </div>
        </div>

        {/* In-UI Arcade Navigation Deck */}
        <nav
          className="w-full max-w-md mx-auto grid grid-cols-3 gap-1 p-1 rounded-lg border border-border-subtle bg-surface-panel/90"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className={[
              'flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] uppercase tracking-wider transition-colors',
              activeView === 'home'
                ? 'font-black bg-accent-recall/15 text-accent-recall border border-accent-recall/30'
                : 'font-bold text-text-muted hover:text-text-primary hover:bg-bg-base/60 border border-transparent'
            ].join(' ')}
          >
            <Gamepad2 size={13} />
            <span>PUZZLES</span>
          </Link>
          <Link
            href="/leaderboard"
            className={[
              'flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] uppercase tracking-wider transition-colors',
              activeView === 'leaderboard'
                ? 'font-black bg-accent-recall/15 text-accent-recall border border-accent-recall/30'
                : 'font-bold text-text-muted hover:text-text-primary hover:bg-bg-base/60 border border-transparent'
            ].join(' ')}
          >
            <Trophy size={13} />
            <span>RANKS</span>
          </Link>
          <Link
            href="/profile"
            className={[
              'flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] uppercase tracking-wider transition-colors',
              activeView === 'profile'
                ? 'font-black bg-accent-recall/15 text-accent-recall border border-accent-recall/30'
                : 'font-bold text-text-muted hover:text-text-primary hover:bg-bg-base/60 border border-transparent'
            ].join(' ')}
          >
            <User size={13} />
            <span>PROFILE</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
