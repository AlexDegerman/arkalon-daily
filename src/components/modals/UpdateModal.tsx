'use client'
import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useUiStore } from '@/app/stores/uiStore'
import { LATEST_UPDATE, UPDATES_VERSION } from '@/lib/updates'
export function UpdateModal() {
  const showUpdateModal = useUiStore((s) => s.showUpdateModal)
  const setShowUpdateModal = useUiStore((s) => s.setShowUpdateModal)
  // Returning players whose acknowledged version stamp is behind get the notes
  useEffect(() => {
    try {
      const playerId = localStorage.getItem('arkalon_daily_player_id')
      const storedVersion = localStorage.getItem('arkalon_daily_version')
      if (playerId && storedVersion && storedVersion !== UPDATES_VERSION) {
        setShowUpdateModal(true)
      }
    } catch {
      // localStorage unavailable
    }
  }, [setShowUpdateModal])
  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem('arkalon_daily_version', UPDATES_VERSION)
    } catch {
      // localStorage unavailable
    }
    setShowUpdateModal(false)
  }, [setShowUpdateModal])
  if (!showUpdateModal) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-title"
    >
      <div className="w-full max-w-sm animate-[fade-in_0.2s_ease-out_both]">
        <div className="rounded-xl border border-border-subtle bg-surface-panel shadow-2xl overflow-hidden max-h-[70svh] flex flex-col">
          <div className="h-1.5 w-full shrink-0 bg-accent-recall" />
          <div className="px-6 pt-4 pb-1 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1 text-accent-recall">
                  New Update
                </span>
                <h2
                  id="update-title"
                  className="text-lg font-black leading-tight text-text-primary"
                >
                  v{LATEST_UPDATE.version}
                </h2>
              </div>
              <button
                onClick={handleDismiss}
                aria-label="Close update notes"
                className="p-2 rounded-full transition-colors duration-150 cursor-pointer hover:bg-surface-hover text-text-muted"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
            <div className="rounded-lg p-4 border border-border-subtle bg-bg-base">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 text-text-muted font-mono">
                {LATEST_UPDATE.date}
              </h3>
              <ul className="space-y-3.5">
                {LATEST_UPDATE.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-accent-recall" />
                    <p className="text-[11px] font-medium leading-relaxed text-text-primary">
                      {change}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="px-6 pb-6 pt-1 shrink-0 z-20 relative">
            <button
              onClick={handleDismiss}
              autoFocus
              className="w-full py-3 rounded-lg text-[11px] font-black uppercase tracking-widest border border-accent-recall/40 bg-accent-recall/10 text-accent-recall transition-colors hover:bg-accent-recall/20 active:scale-[0.98] cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
