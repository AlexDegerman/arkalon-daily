'use client'

import { useEffect, useState } from 'react'
import { Clock, Flame, Radio, CheckCircle2, AlertCircle } from 'lucide-react'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { ArkalonNetworkWidget } from '@/components/ui/ArkalonNetworkWidget'
import { getCategoryStatuses } from '@/app/actions/getCategoryStatuses'
import { CATEGORY_ORDER, CATEGORIES } from '@/constants/categories'
import type { CategoryStatus } from '@/types/puzzle'

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

function getTimeUntilMidnightUtc(): string {
  const now = new Date()
  const midnight = new Date()
  midnight.setUTCHours(24, 0, 0, 0)
  const diffMs = Math.max(0, midnight.getTime() - now.getTime())
  const totalSeconds = Math.floor(diffMs / 1000)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function HomeContent() {
  const [statuses, setStatuses] = useState<CategoryStatus[]>(LOADING_STATUSES)
  const [countdown, setCountdown] = useState<string>('00:00:00')

  useEffect(() => {
    setCountdown(getTimeUntilMidnightUtc())
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnightUtc())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const playerId = getPlayerId()
    if (!playerId) return

    getCategoryStatuses(playerId).then((res) => {
      if (res.success && res.statuses) {
        setStatuses(res.statuses)
      }
    })
  }, [])

  const completedCount = statuses.filter(
    (s) => s.status === 'solved' || s.status === 'failed'
  ).length

  const totalActiveStreaks = statuses.reduce(
    (acc, s) => acc + (s.streakDays > 0 ? 1 : 0),
    0
  )

  return (
    <main className="mx-auto w-full max-w-lg lg:max-w-5xl xl:max-w-6xl px-3 sm:px-4 py-3 sm:py-5 flex flex-col justify-between flex-1 pb-16 lg:pb-8">
      {/* 50/50 Split Terminal on Desktop / Clean Rack on Mobile */}
      <div className="w-full lg:grid lg:grid-cols-2 lg:gap-6 lg:items-stretch my-auto">
        {/* Left Box: 5 Puzzle Cartridges (No awkward air gaps) */}
        <div className="flex flex-col w-full">
          <CategoryGrid statuses={statuses} />
        </div>

        {/* Right Box: Mission Control Terminal (Desktop only) */}
        <div className="hidden lg:flex lg:flex-col w-full h-full">
          <div className="rounded-2xl border border-border-subtle bg-surface-panel/95 p-5 flex flex-col justify-between h-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-recall/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header: System Status */}
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Radio size={14} className="text-accent-recall animate-pulse" />
                <span className="font-mono text-xs font-black tracking-widest text-text-primary">
                  MISSION CONTROL
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-recall/10 border border-accent-recall/30 text-accent-recall font-bold">
                SYSTEM READY
              </span>
            </div>

            {/* Countdown Clock */}
            <div className="flex flex-col gap-1 rounded-xl bg-bg-base/80 border border-border-subtle p-3.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-accent-recall" />
                  <span>UTC 00:00 RESET</span>
                </span>
                <span className="text-accent-recall font-bold">SEED SYNC</span>
              </div>
              <span className="font-mono text-2xl font-black tracking-wider text-text-primary">
                {countdown}
              </span>
              <p className="text-[10px] text-text-muted">
                New daily deterministic challenges generate at midnight UTC.
              </p>
            </div>

            {/* 5-Discipline Status Telemetry */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-primary font-bold tracking-wider">
                  TODAY&apos;S CLEARANCE
                </span>
                <span className="text-accent-recall font-bold">
                  {completedCount} / 5 COMPLETE
                </span>
              </div>

              {/* Progress Pips */}
              <div className="grid grid-cols-5 gap-1.5 w-full">
                {CATEGORY_ORDER.map((slug) => {
                  const cat = CATEGORIES[slug]
                  const s = statuses.find((st) => st.category === slug)
                  const isSolved = s?.status === 'solved'
                  const isFailed = s?.status === 'failed'

                  let bg = '#1c2738'
                  let glow = 'none'

                  if (isSolved) {
                    bg = cat.accentColor
                    glow = `0 0 10px ${cat.accentColor}80`
                  } else if (isFailed) {
                    bg = '#f87171'
                    glow = '0 0 10px rgba(248, 113, 113, 0.5)'
                  }

                  return (
                    <div
                      key={slug}
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ backgroundColor: bg, boxShadow: glow }}
                      title={`${cat.displayName}: ${s?.status ?? 'available'}`}
                    />
                  )
                })}
              </div>

              {/* Discipline Breakdown List */}
              <div className="flex flex-col divide-y divide-border-subtle/60 pt-1">
                {CATEGORY_ORDER.map((slug) => {
                  const cat = CATEGORIES[slug]
                  const s = statuses.find((st) => st.category === slug)
                  const isSolved = s?.status === 'solved'
                  const isFailed = s?.status === 'failed'

                  return (
                    <div
                      key={slug}
                      className="flex items-center justify-between py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm leading-none">{cat.icon}</span>
                        <span
                          className="font-bold tracking-wider uppercase"
                          style={{ color: cat.accentColor }}
                        >
                          {cat.displayName}
                        </span>
                        {s?.streakDays ? (
                          <span className="text-[10px] font-mono text-[#F59E0B] font-bold">
                            🔥{s.streakDays}d
                          </span>
                        ) : null}
                      </div>

                      <div>
                        {isSolved ? (
                          <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-status-success">
                            <CheckCircle2 size={12} />
                            <span>{s?.score} PTS</span>
                          </span>
                        ) : isFailed ? (
                          <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-status-fail">
                            <AlertCircle size={12} />
                            <span>FAILED</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-border-subtle text-text-muted">
                            AVAILABLE
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Streak Footer */}
            <div className="border-t border-border-subtle pt-3 flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Flame size={13} className="text-[#F59E0B]" />
                <span>{totalActiveStreaks} Active Streaks</span>
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                ONE ATTEMPT PER DAY
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Only Bottom Telemetry Console (< 1024px) */}
      <div className="lg:hidden shrink-0 rounded-xl border border-border-subtle bg-surface-panel/95 p-3 flex flex-col gap-2 shadow-lg mt-3">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-text-primary font-bold tracking-wider uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-recall animate-pulse" />
            CLEARED: {completedCount} / 5
          </span>
          <span className="flex items-center gap-1 text-text-muted">
            <Clock size={12} className="text-accent-recall" />
            <span>RESET: {countdown}</span>
          </span>
        </div>

        {/* 5-Segment Mission Status Pips */}
        <div className="grid grid-cols-5 gap-1.5 w-full">
          {CATEGORY_ORDER.map((slug) => {
            const cat = CATEGORIES[slug]
            const s = statuses.find((st) => st.category === slug)
            const isSolved = s?.status === 'solved'
            const isFailed = s?.status === 'failed'

            let bg = '#1c2738'
            let glow = 'none'

            if (isSolved) {
              bg = cat.accentColor
              glow = `0 0 8px ${cat.accentColor}80`
            } else if (isFailed) {
              bg = '#f87171'
              glow = '0 0 8px rgba(248, 113, 113, 0.5)'
            }

            return (
              <div
                key={slug}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ backgroundColor: bg, boxShadow: glow }}
                title={`${cat.displayName}: ${s?.status ?? 'available'}`}
              />
            )
          })}
        </div>

        <p className="text-[9px] text-center text-text-muted tracking-wider font-mono">
          ONE ATTEMPT PER PUZZLE • UTC 00:00 SEED SYNC
        </p>
      </div>

      {/* Arkalon Network Portal Link Widget */}
      <ArkalonNetworkWidget />
    </main>
  )
}
