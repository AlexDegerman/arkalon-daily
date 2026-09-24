'use client'

import { useCallback } from 'react'

interface GlyphKeypadProps {
  glyphs: string[] // ordered keypad layout (may be shuffled)
  onGlyphPress: (glyph: string) => void
  disabled?: boolean
  enteredGlyphs?: string[] // current input sequence for visual feedback
  expectedLength: number
  targetSequence?: string[]
  isTimedOut?: boolean
}

export function GlyphKeypad({
  glyphs,
  onGlyphPress,
  disabled = false,
  enteredGlyphs = [],
  expectedLength,
  targetSequence,
  isTimedOut = false
}: GlyphKeypadProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, glyph: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (!disabled) onGlyphPress(glyph)
      }
    },
    [disabled, onGlyphPress]
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Input progress display */}
      <div
        className="flex min-h-10 flex-wrap items-center justify-center gap-1.5"
        aria-label={`Entered ${enteredGlyphs.length} of ${expectedLength} glyphs`}
        aria-live="polite"
      >
        {Array.from({ length: expectedLength }).map((_, i) => {
          const isEntered = i < enteredGlyphs.length
          const isCorrect =
            isEntered && targetSequence
              ? enteredGlyphs[i] === targetSequence[i]
              : true

          return (
            <span
              key={i}
              className={`flex h-9 w-9 items-center justify-center rounded border font-mono text-lg transition-colors ${
                !isEntered
                  ? isTimedOut
                    ? 'border-status-fail bg-status-fail/15 text-status-fail animate-pulse'
                    : 'border-border-subtle text-transparent'
                  : isCorrect
                    ? 'border-accent-recall bg-accent-recall/10 text-text-primary'
                    : 'border-status-fail bg-status-fail/15 text-status-fail'
              }`}
              aria-hidden="true"
            >
              {enteredGlyphs[i] ?? '_'}
            </span>
          )
        })}
      </div>

      {/* Glyph grid */}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(glyphs.length, 8)}, minmax(0, 1fr))`
        }}
        role="group"
        aria-label="Glyph input keypad"
      >
        {glyphs.map((glyph, i) => (
          <button
            key={`${glyph}-${i}`}
            onClick={() => !disabled && onGlyphPress(glyph)}
            onKeyDown={(e) => handleKeyDown(e, glyph)}
            disabled={disabled}
            aria-label={`Glyph ${glyph}`}
            className={[
              'flex h-12 w-full items-center justify-center rounded-lg border font-mono text-2xl transition-colors',
              'focus-visible:outline-2 focus-visible:outline-accent-recall',
              disabled
                ? 'cursor-not-allowed border-border-subtle text-text-muted opacity-40'
                : 'border-border-subtle bg-surface-panel text-text-primary hover:border-accent-recall hover:bg-accent-recall/10'
            ].join(' ')}
          >
            {glyph}
          </button>
        ))}
      </div>
    </div>
  )
}
