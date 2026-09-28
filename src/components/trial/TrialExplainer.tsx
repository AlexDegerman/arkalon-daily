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
      text: 'Memorize the glyph sequence as each symbol illuminates across the runic pool. Remember the order before the display window expires.'
    },
    {
      text: 'Reproduce the sequence before the time gauge drains. Accuracy and input speed both affect your final score.'
    },
    {
      text: 'Complete three rounds with increasing sequence length. Daily challenges may introduce reverse entry or scrambled keypad layouts.'
    }
  ],
  surge: [
    {
      text: 'Tap glowing energy nodes before they fade away. You can also aim and tap using Space, Z, or X keys.'
    },
    {
      text: 'Chain consecutive hits together to build combo multipliers and increase your score bonus up to 1.5x as the tempo rises.'
    },
    {
      text: 'Avoid red decoy nodes. Hitting one reduces your score and resets your active combo.'
    }
  ],
  cipher: [
    {
      text: 'Analyze the shape sequences or rule discovery boxes to deduce the hidden pattern governing the puzzle.'
    },
    {
      text: 'Select the correct matching shape before the round time gauge empties. Accuracy and error efficiency dictate your score.'
    },
    {
      text: 'Daily challenges cycle through sequence rotations, inductive rule discovery (YES/NO), and multi-constraint elimination.'
    }
  ],
  strike: [
    {
      text: 'Watch the reticle move across the lane. Press FIRE, Space, or Enter when it reaches the target zone.'
    },
    {
      text: 'Your timing is graded by accuracy. Hit the center for Perfect, or earn lower grades based on your distance from the target.'
    },
    {
      text: 'Daily challenges introduce different motion patterns including sine waves, pendulum sweeps, erratic movement, and deceptive feints.'
    }
  ],
  depths: [
    {
      text: 'Hidden crystals are buried throughout the grid. Use your limited charge budget to locate every deposit.'
    },
    {
      text: 'Numbers along the top and left borders reveal crystal counts for each row and column. Use them to eliminate impossible locations.'
    },
    {
      text: 'Sensor clues and Sonar pings reveal distance, direction, or heat signals. Right-click or hold a tile to mark it.'
    }
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
