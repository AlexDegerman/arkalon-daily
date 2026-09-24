'use client'

import { useState, useEffect } from 'react'
import { useSound } from '@/hooks/useSound'

interface StartCountdownOverlayProps {
  onComplete: () => void
}

export function StartCountdownOverlay({
  onComplete
}: StartCountdownOverlayProps) {
  const { play } = useSound()
  const [count, setCount] = useState(3)

  useEffect(() => {
    if (count > 0) {
      play('timer-tick')
      const timer = setTimeout(() => setCount((c) => c - 1), 800)
      return () => clearTimeout(timer)
    }

    // Flash "GO" briefly before releasing control
    const timer = setTimeout(() => {
      onComplete()
    }, 400)
    return () => clearTimeout(timer)
  }, [count, onComplete, play])

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl backdrop-blur-md"
      style={{ backgroundColor: 'rgba(10, 14, 20, 0.85)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Get ready"
    >
      <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-accent-recall mb-2">
        GET READY
      </span>
      <span
        key={count}
        className="font-mono text-6xl font-black text-text-primary"
        aria-live="assertive"
      >
        {count === 0 ? 'GO' : count}
      </span>
    </div>
  )
}
