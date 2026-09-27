'use client'

import { useState, useEffect, useRef } from 'react'
import { useSound } from '@/hooks/useSound'

interface StartCountdownOverlayProps {
  onComplete: () => void
  warningMessage?: string | null
}

export function StartCountdownOverlay({
  onComplete,
  warningMessage
}: StartCountdownOverlayProps) {
  const { play } = useSound()
  const [showingWarning, setShowingWarning] = useState(() =>
    Boolean(warningMessage)
  )
  const [count, setCount] = useState(3)
  const lastPlayedRef = useRef<number | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Flash warning alert for 1 second before starting countdown
  useEffect(() => {
    if (!warningMessage) return
    const timer = setTimeout(() => {
      setShowingWarning(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [warningMessage])

  useEffect(() => {
    if (showingWarning) return

    if (count > 0) {
      if (lastPlayedRef.current !== count) {
        lastPlayedRef.current = count
        play('timer-tick')
      }
      const timer = setTimeout(() => setCount((c) => c - 1), 800)
      return () => clearTimeout(timer)
    }

    // Flash "GO" briefly before releasing control
    const timer = setTimeout(() => {
      onCompleteRef.current()
    }, 400)
    return () => clearTimeout(timer)
  }, [count, showingWarning, play])

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl backdrop-blur-md"
      style={{ backgroundColor: 'rgba(10, 14, 20, 0.85)' }}
      role="dialog"
      aria-modal="true"
      aria-label={showingWarning ? (warningMessage ?? 'Notice') : 'Get ready'}
    >
      {showingWarning ? (
        <div className="flex flex-col items-center gap-1.5 text-center px-4 animate-[fade-in_0.15s_ease-out_both]">
          <span className="text-2xl" aria-hidden="true">
            🔄
          </span>
          <span className="text-sm font-mono font-black uppercase tracking-widest text-[#F59E0B]">
            {warningMessage}
          </span>
          <p className="text-[11px] font-medium text-text-muted">
            Enter glyphs in backwards order
          </p>
        </div>
      ) : (
        <>
          {warningMessage ? (
            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#F59E0B] px-2 py-0.5 rounded border border-[#F59E0B]/40 bg-[#F59E0B]/10 mb-2">
              {warningMessage}
            </span>
          ) : (
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-accent-recall mb-2">
              GET READY
            </span>
          )}
          <span
            key={count}
            className="font-mono text-6xl font-black text-text-primary"
            aria-live="assertive"
          >
            {count === 0 ? 'GO' : count}
          </span>
        </>
      )}
    </div>
  )
}