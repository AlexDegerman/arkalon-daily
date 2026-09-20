'use client'

import { useEffect, useState, useCallback } from 'react'

interface PauseOverlayProps {
  isPaused: boolean
  onResume: () => void
}

// Shown over real-time puzzle surfaces (Surge, Strike) when paused.
// The game surface is blurred - player cannot study state during pause.
// On resume, counts down 3-2-1 before returning control.
export function PauseOverlay({ isPaused, onResume }: PauseOverlayProps) {
  const [countdown, setCountdown] = useState<number | null>(null)

  const handleResume = useCallback(() => {
    setCountdown(3)
  }, [])

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      setCountdown(null)
      onResume()
      return
    }
    const timer = setTimeout(
      () => setCountdown((c) => (c !== null ? c - 1 : null)),
      1000
    )
    return () => clearTimeout(timer)
  }, [countdown, onResume])

  // Close on Escape only when not counting down
  useEffect(() => {
    if (!isPaused || countdown !== null) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleResume()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isPaused, countdown, handleResume])

  if (!isPaused) return null

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md"
      style={{ backgroundColor: 'rgba(10, 14, 20, 0.75)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Game paused"
    >
      {countdown !== null ? (
        <span
          key={countdown}
          className="font-mono text-6xl font-bold text-text-primary"
          aria-live="assertive"
          aria-atomic="true"
        >
          {countdown === 0 ? 'GO' : countdown}
        </span>
      ) : (
        <>
          <p className="mb-6 font-mono text-2xl font-bold tracking-widest text-text-primary">
            PAUSED
          </p>
          <button
            onClick={handleResume}
            autoFocus
            className="rounded-lg border border-border-subtle px-8 py-3 text-sm font-semibold tracking-wider text-text-primary transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent-recall"
          >
            [ RESUME ]
          </button>
          <p className="mt-3 text-xs text-text-muted">or press Escape</p>
        </>
      )}
    </div>
  )
}
