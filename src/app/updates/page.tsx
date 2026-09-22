'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, FileText } from 'lucide-react'
import { UPDATES } from '@/lib/updates'

type UpdateEntry = (typeof UPDATES)[number]
type SortOrder = 'newest' | 'oldest'

export default function UpdatesPage() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const sorted: UpdateEntry[] =
    sortOrder === 'newest' ? UPDATES : [...UPDATES].reverse()

  useEffect(() => {
    if (openId) {
      setTimeout(() => {
        containerRefs.current[openId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }, 100)
    }
  }, [openId])

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-24 min-h-dvh flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-5 shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-wider border border-border-subtle text-text-muted transition-colors hover:text-text-primary hover:border-accent-recall"
          aria-label="Back to Home"
        >
          <ArrowLeft size={13} />
          <span>HOME</span>
        </Link>
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-accent-recall" />
          <h1 className="text-sm sm:text-base font-black tracking-wider text-text-primary">
            UPDATES
          </h1>
        </div>
        <div className="w-14 shrink-0" aria-hidden="true" />
      </div>

      <div className="mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-widest text-text-primary">
            Patch Notes
          </h2>
          <p className="text-[10px] sm:text-[11px] font-medium mt-1 uppercase tracking-wide text-text-muted">
            {UPDATES.length} update{UPDATES.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1 shrink-0 self-start border border-border-subtle bg-bg-base">
          {(['newest', 'oldest'] as const).map((order) => (
            <button
              key={order}
              type="button"
              onClick={() => setSortOrder(order)}
              className="text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor:
                  sortOrder === order ? '#39ff8a' : 'transparent',
                color: sortOrder === order ? '#0a0e14' : '#7c8ba1'
              }}
            >
              {order}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {sorted.map((item: UpdateEntry) => {
          const isOpen = openId === item.id
          const isLatest = item.id === UPDATES[0].id
          const dateParts = item.date.split('-')
          const monthAbbr = new Date(item.date + 'T00:00:00')
            .toLocaleString('en-US', { month: 'short' })
            .toUpperCase()
          const day = dateParts[2]

          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) containerRefs.current[item.id] = el
              }}
              className={`rounded-xl border transition-all duration-200 overflow-hidden scroll-mt-20 ${
                isOpen ? 'border-accent-recall' : 'border-border-subtle'
              }`}
              style={{
                backgroundColor: '#131a24',
                boxShadow: isOpen
                  ? '0 0 0 1px #39ff8a, 0 4px 20px rgba(57, 255, 138, 0.1)'
                  : 'none'
              }}
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
              >
                <div
                  className="shrink-0 flex flex-col items-center rounded-lg px-2.5 py-1.5"
                  style={{
                    backgroundColor: isLatest ? '#39ff8a' : '#0a0e14',
                    border: isLatest ? 'none' : '1px solid #22303f'
                  }}
                >
                  <span
                    className="text-[9px] font-black uppercase tracking-wider leading-none"
                    style={{
                      color: isLatest ? 'rgba(10, 14, 20, 0.6)' : '#7c8ba1'
                    }}
                  >
                    {monthAbbr}
                  </span>
                  <span
                    className="text-sm font-black leading-tight mt-0.5"
                    style={{
                      color: isLatest ? '#0a0e14' : '#e8edf4'
                    }}
                  >
                    {day}
                  </span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-xs sm:text-sm font-bold leading-tight truncate text-text-primary">
                    v{item.version}
                  </span>
                  {isLatest && (
                    <span className="self-start inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent-recall/10 text-accent-recall">
                      <span className="w-1 h-1 rounded-full bg-accent-recall" />
                      Latest
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className="shrink-0 transition-transform duration-200 text-text-muted"
                  style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-border-subtle animate-[fade-in_0.2s_ease-out_both]">
                  <div className="pt-3.5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-border-subtle" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted font-mono">
                        {item.date}
                      </span>
                      <div className="h-px flex-1 bg-border-subtle" />
                    </div>
                    <ul className="flex flex-col gap-3">
                      {item.changes.map((note: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-accent-recall" />
                          <p className="text-[12px] font-medium leading-relaxed text-text-muted">
                            {note}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
