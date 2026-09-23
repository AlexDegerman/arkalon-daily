'use client'

import { useState, useEffect } from 'react'
import {
  ChevronDown,
  ExternalLink,
  Gamepad2,
  Bot,
  MessageSquare
} from 'lucide-react'

/// Official Arkalon Network Vector Emblem
function ArkalonEmblem({
  size = 24,
  theme = 'dark'
}: {
  size?: number
  theme?: 'dark' | 'light'
}) {
  const fillColor = theme === 'dark' ? '#FFFFFF' : '#1E1F22'
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className="shrink-0"
      role="img"
      aria-label="Arkalon"
    >
      <g id="arkalon_mark">
        <g id="outer_silhouette">
          <path
            id="rim"
            d="M440.1 177.85A200 200 0 0 1 445.1 190.89L458.96 188.17A214 214 0 0 1 463.35 203.07L450.23 208.29A200 200 0 0 1 453.54 224.71L467.66 224.44A214 214 0 0 1 469.39 239.88L455.56 242.75A200 200 0 0 1 455.97 259.49L469.92 261.68A214 214 0 0 1 468.95 277.18L454.83 277.6A200 200 0 0 1 452.33 294.16L465.69 298.74A214 214 0 0 1 462.04 313.84L448.06 311.8A200 200 0 1 1 340.52 74.74L333.76 89.24L341.33 102.07L333.57 116.06A160 160 0 1 0 406.82 202.59L422.85 196.92L424.45 184.5Z"
            fill={fillColor}
          />
        </g>
        <g id="probability_core">
          <circle id="core" cx="266.24" cy="246.45" r="112" fill={fillColor} />
        </g>
      </g>
    </svg>
  )
}

export interface NetworkAlert {
  id: string
  type: 'new' | 'updated' | null
}

// Set type to 'new' (green) or 'updated' (golden/amber). Set to null when there are no active alerts.
// Bump 'id' whenever a game launches or receives a major update to show the badge to all players.
export const LATEST_NETWORK_ALERT: NetworkAlert = {
  id: 'arkalon-daily-v1',
  type: 'updated'
}
const SEEN_ALERT_STORAGE_KEY = 'arkalon_network_seen_alert'

const NETWORK_LINKS = [
  {
    label: 'Other Arkalon Games',
    href: 'https://network.rpsleague.fi',
    icon: Gamepad2
  },
  {
    label: 'AI Guidance',
    href: 'https://network.rpsleague.fi/ai',
    icon: Bot
  },
  {
    label: 'Send Feedback',
    href: 'https://network.rpsleague.fi/feedback',
    icon: MessageSquare
  }
] as const

interface ArkalonNetworkWidgetProps {
  storageKey?: string
  theme?: 'dark' | 'light'
}

export function ArkalonNetworkWidget({
  storageKey = 'arkalon_network_widget_collapsed',
  theme = 'dark'
}: ArkalonNetworkWidgetProps) {
  // Non-collapsed by default as requested
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeAlert, setActiveAlert] = useState<'new' | 'updated' | null>(null)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved === 'true') setCollapsed(true)

      if (LATEST_NETWORK_ALERT.type) {
        const seenAlert = localStorage.getItem(SEEN_ALERT_STORAGE_KEY)
        if (seenAlert !== LATEST_NETWORK_ALERT.id) {
          setActiveAlert(LATEST_NETWORK_ALERT.type)
        }
      }
    } catch {}
  }, [storageKey])

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKey, String(next))
      } catch {}
      return next
    })
  }

  const handleOtherGamesClick = () => {
    setActiveAlert(null)
    try {
      localStorage.setItem(SEEN_ALERT_STORAGE_KEY, LATEST_NETWORK_ALERT.id)
    } catch {}
  }

  if (!mounted) return null

  const isUpdated = activeAlert === 'updated'
  const pipColor = isUpdated ? 'bg-[#F59E0B]' : 'bg-accent-recall'

  // Collapsed State: Logo Only (Floating in corner with alert pip)
  if (collapsed) {
    return (
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40">
        <button
          type="button"
          onClick={toggleCollapse}
          title="Open Arkalon Network Menu"
          aria-label="Open Arkalon Network Menu"
          className="relative flex items-center justify-center w-10 h-10 rounded-full border border-border-subtle bg-surface-panel/95 text-text-muted hover:text-text-primary hover:border-accent-recall transition-all shadow-2xl active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <ArkalonEmblem size={20} theme={theme} />
          {activeAlert && (
            <span
              className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full ${pipColor} border-2 border-[#0c111a] animate-pulse`}
            />
          )}
        </button>
      </div>
    )
  }

  // Expanded State: Floating Corner Dock with Scoped Bottom Blur
  return (
    <>
      {/* Scoped bottom blur: softens only the cleared bars area behind the widget without dimming the puzzles */}
      <div
        onClick={toggleCollapse}
        className="sm:hidden fixed bottom-0 inset-x-0 h-44 bg-linear-to-t from-bg-base via-bg-base/85 to-transparent backdrop-blur-sm z-30 animate-[fade-in_0.15s_ease-out_both]"
        aria-hidden="true"
      />

      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 w-[calc(100vw-24px)] max-w-64 rounded-xl border border-border-subtle bg-[#0c111a] p-3 flex flex-col gap-2 shadow-[0_0_25px_rgba(0,0,0,0.85)] animate-[fade-in_0.15s_ease-out_both]">
        {/* Widget Header with Arkalon Logo and Collapse Button */}
        <div className="flex items-center justify-between border-b border-border-subtle/60 pb-2">
          <div className="flex items-center gap-2">
            <ArkalonEmblem size={22} theme={theme} />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-text-primary leading-none">
                ARKALON NETWORK
              </span>
              <span className="text-[8px] text-text-muted font-mono leading-tight">
                ECOSYSTEM PORTAL
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            title="Collapse to logo only"
            aria-label="Collapse to logo only"
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-base transition-colors cursor-pointer"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* 3 Rows of Links under the logo pointing to network.rpsleague.fi */}
        <div className="flex flex-col divide-y divide-border-subtle/40">
          {NETWORK_LINKS.map(({ label, href, icon: Icon }) => {
            const isOtherGames = label === 'Other Arkalon Games'
            return (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={isOtherGames ? handleOtherGamesClick : undefined}
                className="flex items-center justify-between py-1.5 px-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-base/60 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    size={12}
                    className="text-text-muted group-hover:text-accent-recall transition-colors shrink-0"
                  />
                  <span className="text-[11px] font-medium tracking-wide truncate">
                    {label}
                  </span>
                  {isOtherGames && activeAlert && (
                    <span
                      className={`shrink-0 text-[8px] font-mono font-black uppercase px-1.5 py-0.2 rounded border leading-tight ${
                        isUpdated
                          ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40'
                          : 'bg-accent-recall/20 text-accent-recall border-accent-recall/30'
                      }`}
                    >
                      {isUpdated ? 'UPDATED' : 'NEW'}
                    </span>
                  )}
                </div>
                <ExternalLink
                  size={11}
                  className="text-text-muted opacity-70 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                />
              </a>
            )
          })}
        </div>
      </div>
    </>
  )
}
