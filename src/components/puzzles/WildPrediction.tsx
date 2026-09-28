'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { TrialBanner } from '@/components/trial/TrialBanner'
import { StartCountdownOverlay } from '@/components/layout/StartCountdownOverlay'
import { useSound } from '@/hooks/useSound'
import type { WildPredictionData } from '@/lib/puzzles/families/wildPrediction'
import type {
  CipherRound,
  SequenceElement
} from '@/lib/puzzles/patternGenerators'

export interface WildPredictionResult {
  correctRounds: number
  totalRounds: number
  totalIncorrectGuesses: number
  totalElapsedMs: number
  avgResponseMs: number
  roundsCompleted: number
}

interface WildPredictionProps {
  data: WildPredictionData
  isTrial: boolean
  onComplete: (result: WildPredictionResult) => void
}

// CSS color map for element colors
const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316'
}

// SVG path or shape rendering per element shape
function ShapeIcon({
  shape,
  color,
  size,
  className = ''
}: {
  shape: string
  color: string
  size: string
  className?: string
}) {
  const px = size === 'small' ? 16 : size === 'medium' ? 28 : 40
  const fill = COLOR_MAP[color] ?? '#e8edf4'

  const svgProps = {
    width: px,
    height: px,
    viewBox: '0 0 40 40',
    fill,
    className
  }

  switch (shape) {
    case 'circle':
      return (
        <svg {...svgProps}>
          <circle cx="20" cy="20" r="18" />
        </svg>
      )
    case 'square':
      return (
        <svg {...svgProps}>
          <rect x="4" y="4" width="32" height="32" />
        </svg>
      )
    case 'triangle':
      return (
        <svg {...svgProps}>
          <polygon points="20,3 38,37 2,37" />
        </svg>
      )
    case 'diamond':
      return (
        <svg {...svgProps}>
          <polygon points="20,2 38,20 20,38 2,20" />
        </svg>
      )
    case 'hexagon':
      return (
        <svg {...svgProps}>
          <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" />
        </svg>
      )
    case 'star':
      return (
        <svg {...svgProps}>
          <polygon points="20,2 24,15 38,15 27,23 31,37 20,29 9,37 13,23 2,15 16,15" />
        </svg>
      )
    default:
      return (
        <svg {...svgProps}>
          <circle cx="20" cy="20" r="18" />
        </svg>
      )
  }
}

function ElementCard({
  element,
  onClick,
  selected,
  correct,
  incorrect,
  disabled
}: {
  element: SequenceElement
  onClick?: () => void
  selected?: boolean
  correct?: boolean
  incorrect?: boolean
  disabled?: boolean
}) {
  let borderClass = 'border-border-subtle'
  if (correct) borderClass = 'border-status-success bg-status-success/10'
  else if (incorrect) borderClass = 'border-status-fail bg-status-fail/10'
  else if (selected) borderClass = 'border-accent-cipher'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`${element.size} ${element.color} ${element.shape}`}
      aria-pressed={selected}
      className={[
        'flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-colors',
        'focus-visible:outline-2 focus-visible:outline-accent-cipher',
        borderClass,
        disabled ? 'cursor-default opacity-60' : 'hover:border-accent-cipher/60'
      ].join(' ')}
    >
      <ShapeIcon
        shape={element.shape}
        color={element.color}
        size={element.size}
      />
      <span className="text-xs text-text-muted capitalize">{element.size}</span>
    </button>
  )
}

function RoundDisplay({ round }: { round: CipherRound }) {
  // Rule discovery: show yes/no examples
  if (round.generator === 'rule_discovery') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wider text-text-muted">
          Find the rule
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 text-xs font-semibold text-status-success">
              YES
            </span>
            <div className="flex flex-wrap gap-2">
              {(round.yesExamples ?? []).map((el, i) => (
                <ShapeIcon
                  key={i}
                  shape={el.shape}
                  color={el.color}
                  size={el.size}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 text-xs font-semibold text-status-fail">
              NO
            </span>
            <div className="flex flex-wrap gap-2">
              {(round.noExamples ?? []).map((el, i) => (
                <ShapeIcon
                  key={i}
                  shape={el.shape}
                  color={el.color}
                  size={el.size}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          Which of the options below is a YES?
        </p>
      </div>
    )
  }

  // Constrained choice: show constraints
  if (round.generator === 'constrained_choice') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wider text-text-muted">
          Constraints
        </p>
        <ul className="space-y-1">
          {(round.constraints ?? []).map((c, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-sm text-text-primary"
            >
              <span className="text-accent-cipher">&bull;</span>
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-text-muted">
          Which option satisfies all constraints?
        </p>
      </div>
    )
  }

  // Sequence-based generators: show element sequence
  if (round.shownElements.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-wider text-text-muted">
        What comes next?
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {round.shownElements.map((el, i) => (
          <div key={i} className="flex items-center gap-1">
            <ShapeIcon shape={el.shape} color={el.color} size={el.size} />
            {i < round.shownElements.length - 1 && (
              <span className="text-text-muted">&rarr;</span>
            )}
          </div>
        ))}
        <span className="ml-1 text-text-muted">&rarr;</span>
        <span className="font-mono text-lg text-text-muted">?</span>
      </div>
    </div>
  )
}

interface SavedCipherSession {
  roundIndex: number
  correctRounds: number
  totalErrors: number
  incorrectGuesses: number
  responseMsList: number[]
  roundStartTimestamp: number
  elapsedMs: number
  date: string
}

function getSavedCipherSession(): SavedCipherSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('arkalon_daily_cipher_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    if (parsed.date !== today) return null
    return parsed
  } catch {
    return null
  }
}

export function WildPrediction({
  data,
  isTrial,
  onComplete
}: WildPredictionProps) {
  const { play } = useSound()
  const [savedSession] = useState(() =>
    isTrial ? null : getSavedCipherSession()
  )

  const [roundIndex, setRoundIndex] = useState(
    () => savedSession?.roundIndex ?? 0
  )
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [incorrectGuesses, setIncorrectGuesses] = useState(
    () => savedSession?.incorrectGuesses ?? 0
  )
  const [timeLeft, setTimeLeft] = useState<number | null>(data.timerSeconds)
  const [isStarting, setIsStarting] = useState(() => !savedSession)

  const sessionStartRef = useRef(Date.now() - (savedSession?.elapsedMs ?? 0))
  const roundStartRef = useRef(Date.now())
  const responseMsRef = useRef<number[]>(savedSession?.responseMsList ?? [])
  const correctRoundsRef = useRef(savedSession?.correctRounds ?? 0)
  const totalErrorsRef = useRef(savedSession?.totalErrors ?? 0)
  const finishedRef = useRef(false)

  const currentRound: CipherRound | undefined = data.rounds[roundIndex]
  const roundTimeLimit = data.timerSeconds ?? 16

  // Per-round countdown timer; waits for the ready-up countdown on session start
  useEffect(() => {
    if (isStarting) return
    let initialTime = roundTimeLimit
    if (
      savedSession &&
      savedSession.roundIndex === roundIndex &&
      savedSession.roundStartTimestamp
    ) {
      const elapsedSec = Math.floor(
        (Date.now() - savedSession.roundStartTimestamp) / 1000
      )
      initialTime = Math.max(0, roundTimeLimit - elapsedSec)
    }
    setTimeLeft(initialTime)
    roundStartRef.current = Date.now()
    if (initialTime <= 0) {
      totalErrorsRef.current++
      responseMsRef.current.push(roundTimeLimit * 1000)
      advanceRound(false)
      return
    }
    // Pure updater: side effects live in the timeLeft watcher so the
    // tick and the round advance fire exactly once per second boundary
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev === null || prev <= 0 ? prev : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [roundIndex, roundTimeLimit, isStarting, savedSession])

  // Save turn-based state to localStorage
  useEffect(() => {
    if (isTrial) return
    try {
      localStorage.setItem(
        'arkalon_daily_cipher_session',
        JSON.stringify({
          roundIndex,
          correctRounds: correctRoundsRef.current,
          totalErrors: totalErrorsRef.current,
          incorrectGuesses,
          responseMsList: responseMsRef.current,
          roundStartTimestamp: roundStartRef.current,
          elapsedMs: Date.now() - sessionStartRef.current,
          date: new Date().toISOString().slice(0, 10)
        })
      )
    } catch {
      // localStorage unavailable
    }
  }, [roundIndex, incorrectGuesses, isTrial])

  const advanceRound = useCallback(
    (wasCorrect: boolean) => {
      if (wasCorrect) correctRoundsRef.current++

      setTimeout(() => {
        play('cipher-next')
        setFeedback(null)
        setSelectedIndex(null)

        const nextIndex = roundIndex + 1
        if (nextIndex >= data.rounds.length) {
          if (finishedRef.current) return
          finishedRef.current = true
          try {
            localStorage.removeItem('arkalon_daily_cipher_session')
          } catch {}
          const totalElapsedMs = Date.now() - sessionStartRef.current
          const avgResponseMs =
            responseMsRef.current.length > 0
              ? Math.round(
                  responseMsRef.current.reduce((a, b) => a + b, 0) /
                    responseMsRef.current.length
                )
              : 0
          onComplete({
            correctRounds: correctRoundsRef.current,
            totalRounds: data.rounds.length,
            totalIncorrectGuesses: totalErrorsRef.current,
            totalElapsedMs,
            avgResponseMs,
            roundsCompleted: data.rounds.length
          })
        } else {
          setRoundIndex(nextIndex)
          roundStartRef.current = Date.now()
          if (data.timerSeconds !== null) setTimeLeft(data.timerSeconds)
        }
      }, 700)
    },
    [roundIndex, data.rounds.length, data.timerSeconds, onComplete]
  )

  // Urgency tick on each of the final three seconds of a timed round
  useEffect(() => {
    if (isStarting || feedback !== null) return
    if (timeLeft === null || timeLeft > 3) return
    if (timeLeft > 0) {
      play('timer-tick')
      return
    }
    if (timeLeft === 0) {
      // Time up - count as incorrect, advance
      totalErrorsRef.current++
      responseMsRef.current.push((roundTimeLimit ?? 0) * 1000)
      advanceRound(false)
    }
  }, [timeLeft, isStarting, feedback, play, roundTimeLimit, advanceRound])

  const handleChoice = useCallback(
    (index: number) => {
      if (finishedRef.current || feedback !== null || !currentRound) return

      const responseMs = Date.now() - roundStartRef.current
      responseMsRef.current.push(responseMs)

      const chosen = currentRound.choices[index]
      const correct = currentRound.correctAnswer
      const isCorrect =
        chosen.shape === correct.shape &&
        chosen.color === correct.color &&
        chosen.size === correct.size

      setSelectedIndex(index)

      if (isCorrect) {
        play('correct')
        setFeedback('correct')
        advanceRound(true)
      } else {
        play('incorrect')
        setFeedback('incorrect')
        totalErrorsRef.current++
        setIncorrectGuesses((p) => p + 1)
        // Fail the round, reveal answer, and advance
        advanceRound(false)
      }
    },
    [feedback, currentRound, play, advanceRound]
  )

  if (!currentRound) return null

  return (
    <div className="flex w-full flex-col gap-4">
      {isTrial && <TrialBanner />}

      {/* Round progress */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          Round {roundIndex + 1} of {data.rounds.length}
        </span>
      </div>

      {/* Responsive Decaying Timer Bar */}
      {timeLeft !== null && roundTimeLimit !== null && (
        <div className="flex items-center gap-2.5 w-full">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border-subtle">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                timeLeft <= 3 ? 'bg-status-fail' : 'bg-accent-cipher'
              }`}
              style={{ width: `${(timeLeft / roundTimeLimit) * 100}%` }}
              role="progressbar"
              aria-valuenow={timeLeft}
              aria-valuemin={0}
              aria-valuemax={roundTimeLimit}
              aria-label="Round time remaining"
            />
          </div>
          <span
            className={`font-mono text-xs font-bold w-7 text-right shrink-0 ${
              timeLeft <= 3
                ? 'text-status-fail animate-pulse'
                : 'text-text-primary'
            }`}
          >
            {timeLeft}s
          </span>
        </div>
      )}

      {/* Puzzle surface */}
      <div className="relative w-full rounded-xl border border-border-subtle bg-surface-panel p-4">
        {isStarting && (
          <StartCountdownOverlay
            onComplete={() => {
              sessionStartRef.current = Date.now()
              roundStartRef.current = Date.now()
              setIsStarting(false)
            }}
          />
        )}
        <RoundDisplay round={currentRound} />

        {/* Choice grid */}
        <div
          className="mt-4 grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.min(currentRound.choices.length, 4)}, minmax(0, 1fr))`
          }}
          role="group"
          aria-label="Answer choices"
        >
          {currentRound.choices.map((choice, i) => {
            const isAnswer =
              choice.shape === currentRound.correctAnswer.shape &&
              choice.color === currentRound.correctAnswer.color &&
              choice.size === currentRound.correctAnswer.size

            return (
              <ElementCard
                key={i}
                element={choice}
                onClick={() => handleChoice(i)}
                selected={selectedIndex === i}
                correct={
                  (feedback === 'correct' && selectedIndex === i) ||
                  (feedback === 'incorrect' && isAnswer)
                }
                incorrect={feedback === 'incorrect' && selectedIndex === i}
                disabled={feedback !== null}
              />
            )
          })}
        </div>
      </div>

      {/* Errors indicator */}
      {incorrectGuesses > 0 && (
        <p className="text-center text-xs text-text-muted">
          {incorrectGuesses} incorrect{' '}
          {incorrectGuesses === 1 ? 'guess' : 'guesses'} this session
        </p>
      )}
    </div>
  )
}
