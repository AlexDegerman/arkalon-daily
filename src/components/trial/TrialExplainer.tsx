'use client'

import { useState, useCallback } from 'react'
import type { PuzzleCategory } from '@/types/puzzle'
import { CATEGORIES } from '@/constants/categories'

interface ExplainerScreen {
  text: string
}

const EXPLAINER_SCREENS: Record<PuzzleCategory, ExplainerScreen[]> = {
  recall: [
    {
      text: 'Watch the sequence of glyphs light up, then reproduce it from memory.'
    },
    {
      text: 'Three rounds, each longer than the last. Accuracy and speed are scored.'
    }
  ],
  surge: [
    {
      text: 'Tap the glowing nodes before they vanish. Avoid red decoy nodes.'
    },
    {
      text: 'Speed and accuracy both count. The pace increases over 90 seconds.'
    }
  ],
  cipher: [
    { text: 'Study the sequence and find the hidden pattern.' },
    {
      text: 'Select the correct next element. Multiple rounds with increasing complexity.'
    }
  ],
  strike: [
    {
      text: "Watch the reticle move. Press FIRE when it's centered on the target."
    },
    { text: 'Shots are graded: Perfect, Excellent, Good, Early/Late, or Miss.' }
  ],
  depths: [
    { text: 'Hidden crystals are buried in the grid.' },
    {
      text: 'Number tiles show distance to the nearest crystal. Use them to deduce locations.'
    },
    { text: 'You have limited charges \u2014 excavate wisely.' }
  ]
}

interface TrialExplainerProps {
  category: PuzzleCategory
  onBeginTrial: () => void
  onSkip: () => void
}

export function TrialExplainer({
  category,
  onBeginTrial,
  onSkip
}: TrialExplainerProps) {
  const [screenIndex, setScreenIndex] = useState(0)
  const cat = CATEGORIES[category]
  const screens = EXPLAINER_SCREENS[category]
  const isLast = screenIndex === screens.length - 1

  const handleNext = useCallback(() => {
    if (isLast) {
      onBeginTrial()
    } else {
      setScreenIndex((i) => i + 1)
    }
  }, [isLast, onBeginTrial])

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-bg-base/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-explainer-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-panel p-6">
        {/* Category identity */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            {cat.icon}
          </span>
          <div>
            <p
              id="trial-explainer-title"
              className="text-sm font-semibold tracking-widest"
              style={{ color: cat.accentColor }}
            >
              {cat.displayName.toUpperCase()}
            </p>
            <p className="text-xs text-text-muted">How it works</p>
          </div>
        </div>

        {/* Instruction text */}
        <p className="mb-6 text-sm leading-relaxed text-text-primary">
          {screens[screenIndex].text}
        </p>

        {/* Progress dots */}
        <div className="mb-5 flex justify-center gap-1.5">
          {screens.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === screenIndex ? 'bg-text-primary' : 'bg-border-subtle'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 rounded-lg border border-border-subtle px-4 py-2.5 text-xs font-semibold tracking-wider text-text-muted transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-accent-recall"
          >
            SKIP
          </button>
          <button
            onClick={handleNext}
            autoFocus
            className="flex-1 rounded-lg px-4 py-2.5 text-xs font-semibold tracking-wider text-bg-base transition-opacity hover:opacity-90 focus-visible:outline  focus-visible:outline-accent-recall"
            style={{ backgroundColor: cat.accentColor }}
          >
            {isLast ? 'BEGIN TRIAL' : 'NEXT'}
          </button>
        </div>
      </div>
    </div>
  )
}
