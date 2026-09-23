'use client'

import { useState, useEffect } from 'react'

interface RecoveryTutorialOverlayProps {
  onDismiss: () => void
}

export function RecoveryTutorialOverlay({
  onDismiss
}: RecoveryTutorialOverlayProps) {
  const [returnUrl, setReturnUrl] = useState(
    'https://daily.rpsleague.fi/profile'
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReturnUrl(`${window.location.origin}/profile`)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-tutorial-title"
    >
      <div className="w-full max-w-xs rounded-xl border border-border-subtle bg-surface-panel p-5 text-center shadow-2xl animate-[fade-in_0.15s_ease-out_both]">
        <div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-accent-recall/10 border border-accent-recall/30 text-lg">
          🛡️
        </div>

        <h2
          id="recovery-tutorial-title"
          className="mb-1.5 text-sm font-bold tracking-wide text-text-primary"
        >
          Protect Your Streaks
        </h2>

        <p className="mb-4 text-[11px] text-text-muted leading-relaxed">
          No passwords required. Save your <strong>Recovery Code</strong> on the
          Network to restore your streaks if your browser data is ever cleared.
        </p>

        <div className="flex flex-col gap-2">
          <a
            href={`https://network.rpsleague.fi/settings?tab=identity&returnTo=${encodeURIComponent(returnUrl)}`}
            onClick={onDismiss}
            className="w-full rounded-lg bg-accent-recall py-2.5 text-xs font-black tracking-wider text-bg-base font-mono transition-opacity hover:opacity-90"
          >
            VIEW CODE ON NETWORK &rarr;
          </a>
          <button
            onClick={onDismiss}
            autoFocus
            className="w-full py-1.5 text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
