'use client'

import { useEffect, useState, useRef } from 'react'

interface GlyphSequenceDisplayProps {
  sequence: string[]
  displayDurationMs: number
  onComplete: () => void
}

// Displays the glyph sequence for the memory phase, then transitions
// to input when the display timer completes.
export function GlyphSequenceDisplay({
  sequence,
  displayDurationMs,
  onComplete
}: GlyphSequenceDisplayProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (sequence.length === 0) {
      onCompleteRef.current()
      return
    }

    const perGlyphMs = displayDurationMs / sequence.length
    let index = 0

    // Brief initial pause before first glyph
    const startDelay = setTimeout(() => {
      setActiveIndex(0)
      index = 1

      const interval = setInterval(() => {
        if (index < sequence.length) {
          setActiveIndex(index)
          index++
        } else {
          clearInterval(interval)
          // Brief pause after last glyph before transitioning
          setTimeout(() => {
            setActiveIndex(null)
            onCompleteRef.current()
          }, 300)
        }
      }, perGlyphMs)

      return () => clearInterval(interval)
    }, 400)

    return () => clearTimeout(startDelay)
  }, [sequence, displayDurationMs])

  return (
    <div
      className="flex min-h-35 items-center justify-center"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Glyph sequence display"
    >
      {activeIndex !== null && sequence[activeIndex] !== undefined ? (
        <span
          key={activeIndex}
          className="font-mono text-7xl text-text-primary transition-opacity duration-100"
          aria-label={`Glyph ${activeIndex + 1} of ${sequence.length}`}
        >
          {sequence[activeIndex]}
        </span>
      ) : (
        <span className="text-sm text-text-muted">Preparing...</span>
      )}
    </div>
  )
}
