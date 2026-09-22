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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-tutorial-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-panel p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-recall/10 text-2xl">
          🛡️
        </div>

        <h2
          id="recovery-tutorial-title"
          className="mb-2 text-base font-semibold tracking-wider text-text-primary"
        >
          Protect Your Streaks
        </h2>

        <p className="mb-3 text-xs text-text-muted leading-relaxed">
          Arkalon Daily doesn&apos;t use passwords. Your profile, stats, and
          streaks are secured by your{' '}
          <strong>Arkalon Core Recovery Code</strong> on the Network Hub.
        </p>

        <p className="mb-5 text-xs text-text-muted leading-relaxed">
          Save your recovery code so you can restore your account on any device
          if your browser data is ever cleared.
        </p>

        <div className="flex flex-col gap-2">
          <a
            href={`https://network.rpsleague.fi/settings?tab=identity&returnTo=${encodeURIComponent(returnUrl)}`}
            onClick={onDismiss}
            className="w-full rounded-lg bg-accent-recall px-4 py-3 text-xs font-bold tracking-wider text-bg-base transition-opacity hover:opacity-90"
          >
            VIEW RECOVERY CODE ON HUB &rarr;
          </a>
          <button
            onClick={onDismiss}
            autoFocus
            className="w-full rounded-lg border border-border-subtle px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
          >
            I ALREADY SAVED IT
          </button>
        </div>
      </div>
    </div>
  )
}
