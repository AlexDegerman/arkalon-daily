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
      text: 'Watch the sequence of runic symbols illuminate across the screen. Memorize their exact order before the display window expires.'
    },
    {
      text: 'Reproduce the sequence by tapping the keypad. Accuracy across all 3 rounds and rapid input maximize your score. Letting the timer expire penalizes unentered glyphs as errors.'
    },
    {
      text: 'Daily challenges increase sequence lengths and introduce reverse sequence entry (Reverse) or scrambled button positions (Shuffled).'
    }
  ],
  surge: [
    {
      text: 'Tap glowing energy nodes before they fade away. You can tap directly on the screen or aim with mouse and tap using Space, Z, or X.'
    },
    {
      text: 'Chain consecutive hits to build combos up to a 1.5x score bonus. Avoid red decoy nodes—hitting one penalizes your score and instantly resets your combo.'
    },
    {
      text: 'Daily challenges cycle through 19 dynamic spawn patterns (such as Spirals and Waves) and mutating target behaviors.'
    }
  ],
  cipher: [
    {
      text: 'Analyze the sequence of shapes, colors, and sizes to deduce the hidden rule governing the puzzle.'
    },
    {
      text: 'Select the one card that satisfies the rule before the round timer expires. Accuracy and avoiding incorrect guesses maximize your score.'
    },
    {
      text: 'Daily challenges cycle through attribute sequence loops, inductive rule discovery (YES/NO example boxes), and multi-constraint elimination.'
    }
  ],
  strike: [
    {
      text: 'A reticle sweeps across the lane. Tap FIRE (or press Space / Enter) when the reticle aligns with the target window.'
    },
    {
      text: 'Your timing is graded by accuracy: dead-center hits award Perfect (100%), while near-misses yield lower grades. Letting the reticle pass without firing counts as a total miss (0%).'
    },
    {
      text: 'Daily challenges introduce deceptive feints (reverse bursts), stepper motor pulses (Staccato), harmonic sweeps (Pendulum), and erratic frequency flutter.'
    }
  ],
  depths: [
    {
      text: 'Goal: Excavate all hidden crystals by tapping/clicking tiles to dig them. Digging an empty tile wastes 1 charge and reduces your score. If charges reach 0, the excavation ends and your score is based on the crystals unearthed.'
    },
    {
      text: 'The numbers along the top and left borders indicate the exact crystal count for that entire row or column. For example, a "0" means every tile in that line is empty.'
    },
    {
      text: 'Pre-revealed clues give proximity signals (distance, arrows, or neighbor counts). Marking with flags (🚩) is completely optional, it is a free utility tool to help you track suspected crystals (you must still dig to collect them). Digging an empty tile pings its exact distance.'
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
