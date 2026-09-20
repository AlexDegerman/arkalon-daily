'use client'

interface RecoveryTutorialOverlayProps {
  recoveryCode: string
  onDismiss: () => void
}

// Shown exactly once on first profile page visit.
// Explains the recovery code and why it should be saved.
export function RecoveryTutorialOverlay({
  recoveryCode,
  onDismiss
}: RecoveryTutorialOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-tutorial-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-panel p-6">
        <h2
          id="recovery-tutorial-title"
          className="mb-2 text-base font-semibold tracking-wider text-text-primary"
        >
          Save Your Recovery Code
        </h2>
        <p className="mb-4 text-sm text-text-muted">
          Arkalon Daily doesn&apos;t use passwords. Your recovery code is the
          only way to restore your streaks and stats on a new device.
        </p>
        <div className="mb-4 rounded-lg bg-bg-base px-4 py-3">
          <code className="font-mono text-sm font-semibold tracking-widest text-text-primary">
            {recoveryCode}
          </code>
        </div>
        <p className="mb-5 text-xs text-text-muted">
          Write it down or screenshot this screen. You can find it again in your
          profile at any time.
        </p>
        <button
          onClick={onDismiss}
          autoFocus
          className="w-full rounded-lg border border-accent-recall px-4 py-3 text-sm font-semibold tracking-wider text-accent-recall transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          GOT IT
        </button>
      </div>
    </div>
  )
}
