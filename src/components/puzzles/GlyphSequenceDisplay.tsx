'use client'

import { useEffect, useState, useRef } from 'react'

interface GlyphSequenceDisplayProps {
  sequence: string[]
  displayDurationMs: number
  onComplete: () => void
  onTick?: (index: number) => void
}

// Displays the glyph sequence for the memory phase, then transitions
// to input when the display timer completes.
export function GlyphSequenceDisplay({
  sequence,
  displayDurationMs,
  onComplete,
  onTick
}: GlyphSequenceDisplayProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const postDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (sequence.length === 0) {
      onCompleteRef.current()
      return
    }

    const perGlyphMs = displayDurationMs / sequence.length
    let index = 0

    // Render first glyph and play its tick in perfect synchrony on mount
    setActiveIndex(0)
    onTickRef.current?.(0)

    intervalRef.current = setInterval(() => {
      index++
      if (index < sequence.length) {
        setActiveIndex(index)
        onTickRef.current?.(index)
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = null
        postDelayRef.current = setTimeout(() => {
          setActiveIndex(null)
          onCompleteRef.current()
        }, 250)
      }
    }, perGlyphMs)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (postDelayRef.current) clearTimeout(postDelayRef.current)
    }
  }, [sequence, displayDurationMs])

  return (
    <div
      className="flex min-h-35 items-center justify-center"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Glyph sequence display"
    >
      {activeIndex !== null && sequence[activeIndex] !== undefined && (
        <span
          key={activeIndex}
          className="font-mono text-7xl text-text-primary transition-opacity duration-100"
          aria-label={`Glyph ${activeIndex + 1} of ${sequence.length}`}
        >
          {sequence[activeIndex]}
        </span>
      )}
    </div>
  )
}
