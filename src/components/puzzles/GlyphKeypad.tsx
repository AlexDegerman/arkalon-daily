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

  // Balance columns to avoid awkward orphan rows and stretched pills
  const count = glyphs.length
  let gridCols = 5
  if (count <= 6) gridCols = count
  else if (count === 8) gridCols = 4
  else if (count === 10) gridCols = 5
  else if (count === 12) gridCols = 6
  else if (count === 14) gridCols = 7
  else if (count === 16) gridCols = 4
  else gridCols = Math.min(count, 5)

  // Fluid responsive glyph font scaling based on grid density
  const glyphFontSize =
    gridCols >= 7
      ? 'text-xl min-[380px]:text-2xl sm:text-3xl'
      : 'text-2xl min-[380px]:text-3xl sm:text-4xl md:text-[40px]'

  return (
    <div className="flex flex-col gap-4">
      {/* Input progress display */}
      <div
        className="flex min-h-12 flex-wrap items-center justify-center gap-2"
        aria-label={`Entered ${enteredGlyphs.length} of ${expectedLength} glyphs`}
        aria-live="polite"
      >
        {Array.from({ length: expectedLength }).map((_, i) => {
          const isEntered = i < enteredGlyphs.length
          const isCorrect =
            isEntered && targetSequence
              ? enteredGlyphs[i] === targetSequence[i]
              : true

          // On timeout, reveal the missed correct shape in red
          const displayChar = isEntered
            ? enteredGlyphs[i]
            : isTimedOut && targetSequence?.[i]
              ? targetSequence[i]
              : ''

          return (
            <span
              key={i}
              className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border font-mono text-xl sm:text-2xl md:text-3xl transition-colors ${
                !isEntered
                  ? isTimedOut
                    ? 'border-status-fail bg-status-fail/15 text-status-fail font-bold animate-pulse'
                    : 'border-border-subtle bg-bg-base/50 text-transparent'
                  : isCorrect
                    ? 'border-accent-recall bg-accent-recall/15 text-text-primary font-bold'
                    : 'border-status-fail bg-status-fail/15 text-status-fail font-bold'
              }`}
              aria-hidden="true"
            >
              {displayChar}
            </span>
          )
        })}
      </div>

      {/* Glyph grid */}
      <div
        className="grid gap-2 sm:gap-2.5 mx-auto w-full"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
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
              `flex aspect-square w-full items-center justify-center rounded-xl border font-mono ${glyphFontSize} transition-all leading-none`,
              'focus-visible:outline-2 focus-visible:outline-accent-recall active:scale-95 cursor-pointer select-none',
              disabled
                ? 'cursor-not-allowed border-border-subtle text-text-muted opacity-40'
                : 'border-border-subtle bg-surface-panel text-text-primary hover:border-accent-recall hover:bg-accent-recall/10 hover:shadow-[0_0_14px_rgba(57,255,138,0.25)]'
            ].join(' ')}
          >
            {glyph}
          </button>
        ))}
      </div>
    </div>
  )
}
