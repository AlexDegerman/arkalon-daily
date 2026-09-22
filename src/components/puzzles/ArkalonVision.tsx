'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { GlyphSequenceDisplay } from './GlyphSequenceDisplay'
import { GlyphKeypad } from './GlyphKeypad'
import { TrialBanner } from '@/components/trial/TrialBanner'
import { useSound } from '@/hooks/useSound'
import type {
  ArkalonVisionData,
  ArkalonVisionRound
} from '@/lib/puzzles/families/arkalonVision'

type RoundPhase = 'display' | 'input' | 'feedback'

interface RoundState {
  roundIndex: number
  phase: RoundPhase
  entered: string[]
  errors: number
  startMs: number
}

export interface ArkalonVisionResult {
  rounds: {
    correctGlyphs: number
    sequenceLength: number
    elapsedMs: number
    errors: number
  }[]
  totalElapsedMs: number
}

interface ArkalonVisionProps {
  data: ArkalonVisionData
  isTrial: boolean
  onComplete: (result: ArkalonVisionResult) => void
}

interface SavedRecallSession {
  roundIndex: number
  phase: RoundPhase
  entered: string[]
  errors: number
  roundResults: ArkalonVisionResult['rounds']
  elapsedMs: number
  date: string
}

function getSavedRecallSession(): SavedRecallSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('arkalon_daily_recall_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    if (parsed.date !== today) return null
    return parsed
  } catch {
    return null
  }
}

export function ArkalonVision({
  data,
  isTrial,
  onComplete
}: ArkalonVisionProps) {
  const { play } = useSound()
  const [savedSession] = useState(() =>
    isTrial ? null : getSavedRecallSession()
  )

  const [roundState, setRoundState] = useState<RoundState>(() => {
    if (savedSession) {
      return {
        roundIndex: savedSession.roundIndex,
        phase: savedSession.phase === 'feedback' ? 'input' : savedSession.phase,
        entered: savedSession.entered ?? [],
        errors: savedSession.errors ?? 0,
        startMs: Date.now()
      }
    }
    return {
      roundIndex: 0,
      phase: 'display',
      entered: [],
      errors: 0,
      startMs: 0
    }
  })

  const sessionStartMs = useRef(Date.now() - (savedSession?.elapsedMs ?? 0))
  const roundResults = useRef<ArkalonVisionResult['rounds']>(
    savedSession?.roundResults ?? []
  )

  const currentRound: ArkalonVisionRound | undefined =
    data.rounds[roundState.roundIndex]

  // Persist turn-based state to localStorage on each meaningful change
  useEffect(() => {
    if (isTrial) return
    try {
      localStorage.setItem(
        'arkalon_daily_recall_session',
        JSON.stringify({
          roundIndex: roundState.roundIndex,
          phase: roundState.phase,
          entered: roundState.entered,
          errors: roundState.errors,
          roundResults: roundResults.current,
          elapsedMs: Date.now() - sessionStartMs.current,
          date: new Date().toISOString().slice(0, 10)
        })
      )
    } catch {
      // localStorage unavailable - silently ignore
    }
  }, [
    roundState.roundIndex,
    roundState.phase,
    roundState.entered,
    roundState.errors,
    isTrial
  ])

  useEffect(() => {
    if (roundState.phase === 'display' && currentRound) {
      play('sequence-tick')
    }
  }, [roundState.phase, currentRound, play])

  const handleDisplayComplete = useCallback(() => {
    setRoundState((prev) => ({
      ...prev,
      phase: 'input',
      entered: [],
      startMs: Date.now()
    }))
  }, [])

  const handleGlyphPress = useCallback(
    (glyph: string) => {
      if (!currentRound || roundState.phase !== 'input') return

      const sequence = data.reverseEntry
        ? [...currentRound.sequence].reverse()
        : currentRound.sequence

      const nextIndex = roundState.entered.length
      const expected = sequence[nextIndex]
      const isCorrect = glyph === expected

      if (!isCorrect) {
        play('incorrect')
        setRoundState((prev) => ({ ...prev, errors: prev.errors + 1 }))
      } else {
        play('correct')
      }

      const newEntered = [...roundState.entered, glyph]

      // Round complete when all glyphs entered
      if (newEntered.length >= sequence.length) {
        const elapsedMs = Date.now() - roundState.startMs
        const correctGlyphs = newEntered.filter(
          (g, i) => g === sequence[i]
        ).length

        roundResults.current.push({
          correctGlyphs,
          sequenceLength: sequence.length,
          elapsedMs,
          errors: roundState.errors + (isCorrect ? 0 : 1)
        })

        play('round-complete')

        setRoundState((prev) => ({
          ...prev,
          entered: newEntered,
          phase: 'feedback',
          errors: prev.errors + (isCorrect ? 0 : 1)
        }))

        // Advance to next round or complete
        setTimeout(() => {
          const nextRoundIndex = roundState.roundIndex + 1
          if (nextRoundIndex < data.rounds.length) {
            setRoundState({
              roundIndex: nextRoundIndex,
              phase: 'display',
              entered: [],
              errors: 0,
              startMs: 0
            })
          } else {
            // All rounds complete
            try {
              localStorage.removeItem('arkalon_daily_recall_session')
            } catch {}
            const totalElapsedMs = Date.now() - sessionStartMs.current
            onComplete({
              rounds: roundResults.current,
              totalElapsedMs
            })
          }
        }, 800)
      } else {
        setRoundState((prev) => ({
          ...prev,
          entered: newEntered,
          errors: prev.errors + (isCorrect ? 0 : 1)
        }))
      }
    },
    [
      currentRound,
      roundState,
      data.reverseEntry,
      data.rounds.length,
      play,
      onComplete
    ]
  )

  if (!currentRound) return null

  const sequence = data.reverseEntry
    ? [...currentRound.sequence].reverse()
    : currentRound.sequence

  return (
    <div className="flex w-full flex-col gap-4">
      {isTrial && <TrialBanner />}

      {/* Round progress */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          Round {roundState.roundIndex + 1} of {data.rounds.length}
        </span>
        {data.reverseEntry &&
          roundState.roundIndex === data.rounds.length - 1 && (
            <span className="text-accent-cipher">Reverse entry</span>
          )}
      </div>

      {/* Puzzle surface */}
      <div className="w-full rounded-xl border border-border-subtle bg-surface-panel p-4">
        {roundState.phase === 'display' && (
          <GlyphSequenceDisplay
            sequence={currentRound.sequence}
            displayDurationMs={currentRound.displayDurationMs}
            onComplete={handleDisplayComplete}
            onTick={() => play('sequence-tick')}
          />
        )}

        {(roundState.phase === 'input' || roundState.phase === 'feedback') && (
          <div className="flex flex-col gap-4">
            {data.reverseEntry &&
              roundState.roundIndex === data.rounds.length - 1 && (
                <p className="text-center text-xs text-text-muted">
                  Enter the sequence in reverse order
                </p>
              )}
            <GlyphKeypad
              glyphs={currentRound.keypadOrder}
              onGlyphPress={handleGlyphPress}
              disabled={roundState.phase === 'feedback'}
              enteredGlyphs={roundState.entered}
              expectedLength={sequence.length}
            />
          </div>
        )}
      </div>
    </div>
  )
}
