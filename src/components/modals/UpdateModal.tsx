'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUiStore } from '@/app/stores/uiStore'
import { UPDATES, CURRENT_VERSION } from '@/lib/updates'

// Shown when the stored version is behind the current version.
export function UpdateModal() {
  const activeModal = useUiStore((s) => s.activeModal)
  const setActiveModal = useUiStore((s) => s.setActiveModal)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (activeModal === 'update') setVisible(true)
  }, [activeModal])

  const handleDismiss = useCallback(() => {
    localStorage.setItem('arkalon_daily_version', CURRENT_VERSION)
    setActiveModal(null)
    setVisible(false)
  }, [setActiveModal])

  if (!visible || activeModal !== 'update') return null

  const latest = UPDATES[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-panel p-6">
        <h2
          id="update-title"
          className="mb-1 text-center text-lg font-semibold tracking-widest text-text-primary"
        >
          WHAT&apos;S NEW
        </h2>
        <p className="mb-4 text-center text-xs text-text-muted">
          Version {latest.version} &mdash; {latest.date}
        </p>

        <ul className="mb-6 space-y-2">
          {latest.changes.map((change, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-text-primary"
            >
              <span className="mt-0.5 text-accent-recall">+</span>
              <span>{change}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleDismiss}
          className="w-full rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-text-primary transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          GOT IT
        </button>
      </div>
    </div>
  )
}
