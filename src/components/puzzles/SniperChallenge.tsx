'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { TrialBanner } from '@/components/trial/TrialBanner'
import { PauseOverlay } from '@/components/layout/PauseOverlay'
import { useSound } from '@/hooks/useSound'
import { usePuzzleStore } from '@/app/stores/puzzleStore'
import { calcReticleX } from '@/lib/puzzles/compositionSystem'
import type {
  SniperChallengeData,
  SniperShot
} from '@/lib/puzzles/families/sniperChallenge'
import type { MotionFunctionId } from '@/types/puzzle'
import { StartCountdownOverlay } from '@/components/layout/StartCountdownOverlay'

export interface SniperChallengeResult {
  shots: { deviationPx: number; targetWindowPx: number }[]
  totalElapsedMs: number
  perfectHits: number
  excellentHits: number
  accuracyPct: number
  avgDeviation: number
  totalShots: number
}

type ShotGrade = 'perfect' | 'excellent' | 'good' | 'early-late' | 'miss'

function gradeName(g: ShotGrade): string {
  const names: Record<ShotGrade, string> = {
    perfect: 'PERFECT',
    excellent: 'EXCELLENT',
    good: 'GOOD',
    'early-late': 'EARLY / LATE',
    miss: 'MISS'
  }
  return names[g]
}

function gradeColor(g: ShotGrade): string {
  const colors: Record<ShotGrade, string> = {
    perfect: '#39ff8a',
    excellent: '#00d4ff',
    good: '#a78bfa',
    'early-late': '#F59E0B',
    miss: '#f87171'
  }
  return colors[g]
}

function getGrade(deviationPx: number, targetWindowPx: number): ShotGrade {
  if (deviationPx < 5) return 'perfect'
  if (deviationPx < 15) return 'excellent'
  if (deviationPx < targetWindowPx * 0.5) return 'good'
  if (deviationPx < targetWindowPx) return 'early-late'
  return 'miss'
}

function calcDeceptivePassDuration(
  targetCenterX: number,
  movementSpeed: number
): number {
  const v = movementSpeed * 200
  const approachX = Math.max(0, targetCenterX - 100)
  const deceptStart = approachX / v
  const deceptEnd = deceptStart + 0.3
  const deceptPos = approachX + v * 0.3 * 0.3
  const reverseEnd = deceptEnd + 0.2
  const reversePos = deceptPos - v * 0.25 * 0.2
  const snapDuration = Math.max(0, 600 - reversePos) / (1.2 * v)
  return reverseEnd + snapDuration
}

// Deceptive motion: approach target, fake-decelerate, then accelerate through
function calcDeceptiveX(
  tSec: number,
  targetCenterX: number,
  movementSpeed: number
): number {
  const v = movementSpeed * 200
  const passDuration = calcDeceptivePassDuration(targetCenterX, movementSpeed)
  const tInPass = tSec % passDuration
  const approachThreshold = Math.max(0, targetCenterX - 100) / v
  const deceptStart = approachThreshold
  const deceptEnd = deceptStart + 0.3 // 300ms decel phase
  const reverseEnd = deceptEnd + 0.2 // 200ms reverse phase

  if (tInPass < deceptStart) {
    return v * tInPass
  } else if (tInPass < deceptEnd) {
    // Decelerate to 30% speed
    const dt = tInPass - deceptStart
    return Math.max(0, targetCenterX - 100) + v * 0.3 * dt
  } else if (tInPass < reverseEnd) {
    // Brief reverse
    const dt = tInPass - deceptEnd
    const deceptPos =
      Math.max(0, targetCenterX - 100) + v * 0.3 * (deceptEnd - deceptStart)
    return deceptPos - v * 0.25 * dt
  } else {
    // Accelerate through at 1.2x
    const dt = tInPass - reverseEnd
    const reversePos =
      Math.max(0, targetCenterX - 100) +
      v * 0.3 * (deceptEnd - deceptStart) -
      v * 0.25 * (reverseEnd - deceptEnd)
    return Math.min(600, reversePos + v * 1.2 * dt)
  }
}

interface SniperChallengeProps {
  data: SniperChallengeData
  isTrial: boolean
  onComplete: (result: SniperChallengeResult) => void
}

const TRACK_LOGICAL_WIDTH = 600

interface SavedStrikeSession {
  shotIndex: number
  shots: SniperChallengeResult['shots']
  inFlight: boolean
  sessionStartTimestamp: number
  date: string
}

function getSavedStrikeSession(): SavedStrikeSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('arkalon_daily_strike_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    if (parsed.date !== today) return null
    return parsed
  } catch {
    return null
  }
}

export function SniperChallenge({
  data,
  isTrial,
  onComplete
}: SniperChallengeProps) {
  const { play } = useSound()
  const pauseSignal = usePuzzleStore((s) => s.pauseSignal)
  const trackRef = useRef<HTMLDivElement>(null)
  const [trackWidth, setTrackWidth] = useState(TRACK_LOGICAL_WIDTH)

  useEffect(() => {
    if (!trackRef.current) return
    const obs = new ResizeObserver((entries) => {
      setTrackWidth(entries[0]?.contentRect.width ?? TRACK_LOGICAL_WIDTH)
    })
    obs.observe(trackRef.current)
    return () => obs.disconnect()
  }, [])

  const scale = trackWidth / TRACK_LOGICAL_WIDTH

  const [savedSession] = useState(() =>
    isTrial ? null : getSavedStrikeSession()
  )

  const [initialShots] = useState<SniperChallengeResult['shots']>(() => {
    if (!savedSession) return []
    const shots = [...savedSession.shots]
    if (savedSession.inFlight && shots.length < data.shotCount) {
      const targetWindowPx = data.shots[shots.length]?.targetWindowPx ?? 40
      shots.push({
        deviationPx: targetWindowPx * 2,
        targetWindowPx
      })
    }
    return shots
  })

  const [shotIndex, setShotIndex] = useState(() => initialShots.length)
  const [isStarting, setIsStarting] = useState(() => initialShots.length === 0)
  const [isPaused, setIsPaused] = useState(false)
  const [lastGrade, setLastGrade] = useState<ShotGrade | null>(null)
  const [gradeVisible, setGradeVisible] = useState(false)

  const isStartingRef = useRef(initialShots.length === 0)
  const isResolvingRef = useRef(false)
  const rafRef = useRef<number>(0)
  const shotStartRef = useRef<number>(0)
  const pausedMsRef = useRef<number>(0)
  const pauseStartRef = useRef<number>(0)
  const reticleXRef = useRef<number>(0)
  const reticleElRef = useRef<HTMLDivElement>(null)
  const sessionStartRef = useRef<number>(
    savedSession?.sessionStartTimestamp
      ? performance.now() - (Date.now() - savedSession.sessionStartTimestamp)
      : 0
  )
  const sessionStartTimestampRef = useRef<number>(
    savedSession?.sessionStartTimestamp ?? Date.now()
  )
  const resultsRef = useRef<SniperChallengeResult['shots']>(initialShots)
  const finishedRef = useRef(false)

  useEffect(() => {
    if (initialShots.length >= data.shotCount && !finishedRef.current) {
      finishedRef.current = true
      try {
        localStorage.removeItem('arkalon_daily_strike_session')
      } catch {}
      const totalElapsedMs = Math.round(
        performance.now() - sessionStartRef.current
      )
      const shots = resultsRef.current
      const perfectHits = shots.filter((s) => s.deviationPx < 5).length
      const excellentHits = shots.filter(
        (s) => s.deviationPx >= 5 && s.deviationPx < 15
      ).length
      const hits = shots.filter((s) => s.deviationPx < s.targetWindowPx).length
      const accuracyPct = Math.round((hits / shots.length) * 100)
      const avgDeviation = Math.round(
        shots.reduce((s, r) => s + r.deviationPx, 0) / shots.length
      )
      onComplete({
        shots,
        totalElapsedMs,
        perfectHits,
        excellentHits,
        accuracyPct,
        avgDeviation,
        totalShots: shots.length
      })
    }
  }, [initialShots.length, data.shotCount, onComplete])

  const currentShot: SniperShot | undefined = data.shots[shotIndex]

  useEffect(() => {
    if (pauseSignal > 0) setIsPaused(true)
  }, [pauseSignal])
  // Pause on tab hidden
  useEffect(() => {
    function onVisibility() {
      if (document.hidden && !finishedRef.current) setIsPaused(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Escape to pause
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !finishedRef.current) setIsPaused((p) => !p)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (isPaused) {
      pauseStartRef.current = performance.now()
    } else if (pauseStartRef.current > 0) {
      pausedMsRef.current += performance.now() - pauseStartRef.current
      pauseStartRef.current = 0
    }
  }, [isPaused])

  // Reset shot timer when shot index changes
  useEffect(() => {
    shotStartRef.current = performance.now()
    pausedMsRef.current = 0
    if (sessionStartRef.current === 0)
      sessionStartRef.current = performance.now()

    if (!isTrial && !finishedRef.current && shotIndex < data.shotCount) {
      try {
        localStorage.setItem(
          'arkalon_daily_strike_session',
          JSON.stringify({
            shotIndex,
            shots: resultsRef.current,
            inFlight: true,
            sessionStartTimestamp: sessionStartTimestampRef.current,
            date: new Date().toISOString().slice(0, 10)
          })
        )
      } catch {}
    }
  }, [shotIndex, isTrial, data.shotCount])

  const isPausedRef = useRef(isPaused)
  isPausedRef.current = isPaused

  // rAF loop - only updates the reticle DOM element directly to avoid React re-renders
  useEffect(() => {
    if (!currentShot || finishedRef.current || isStarting) return

    if (sessionStartRef.current === 0) {
      sessionStartRef.current = performance.now()
    }

    function tick(now: number) {
      if (finishedRef.current) return
      if (isPausedRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const tMs = now - shotStartRef.current - pausedMsRef.current
      const tSec = tMs / 1000

      let logicalX: number
      const fn = data.motionFunction as MotionFunctionId

      if (fn === 'deceptive' && currentShot) {
        logicalX = calcDeceptiveX(
          tSec,
          currentShot.targetCenterX,
          data.movementSpeed
        )
      } else {
        logicalX = calcReticleX(
          fn,
          tSec,
          data.movementSpeed,
          currentShot?.freqHz ?? 0.5
        )
      }

      logicalX = Math.max(0, Math.min(TRACK_LOGICAL_WIDTH, logicalX))
      reticleXRef.current = logicalX

      if (reticleElRef.current) {
        reticleElRef.current.style.left = `${logicalX * scale}px`
      }

      // Auto-miss if reticle completes full traversal without FIRE
      let roundTripSec: number

      if (fn === 'deceptive' && currentShot) {
        roundTripSec =
          calcDeceptivePassDuration(
            currentShot.targetCenterX,
            data.movementSpeed
          ) + 0.5
      } else if (fn === 'staccato') {
        roundTripSec = ((1200 / 45) * 0.4) / data.movementSpeed + 0.5
      } else if (fn === 'pendulum') {
        roundTripSec = (520 * Math.PI) / (data.movementSpeed * 200) + 0.5
      } else if (fn === 'sinusoidal') {
        roundTripSec = Math.max(
          3.5,
          2 / ((currentShot?.freqHz ?? 0.5) * data.movementSpeed)
        )
      } else {
        roundTripSec =
          (TRACK_LOGICAL_WIDTH * 2) / (data.movementSpeed * 200) + 0.5
      }

      if (tSec >= roundTripSec) {
        handleFire(true)
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [shotIndex, isStarting, currentShot, data, scale])

  const handleFire = useCallback(
    (autoMiss = false) => {
      if (
        finishedRef.current ||
        isPaused ||
        isStartingRef.current ||
        isResolvingRef.current ||
        !currentShot
      )
        return
      isResolvingRef.current = true
      cancelAnimationFrame(rafRef.current)

      const reticleX = autoMiss ? -9999 : reticleXRef.current
      const deviationPx = Math.abs(reticleX - currentShot.targetCenterX)
      const grade = getGrade(deviationPx, currentShot.targetWindowPx)

      if (autoMiss || grade === 'miss') {
        play('incorrect')
      } else if (grade === 'perfect') {
        play('shot-perfect')
      } else {
        play('shot-basic')
      }

      resultsRef.current.push({
        deviationPx: autoMiss ? currentShot.targetWindowPx * 2 : deviationPx,
        targetWindowPx: currentShot.targetWindowPx
      })

      setLastGrade(autoMiss ? 'miss' : grade)
      setGradeVisible(true)
      setTimeout(() => setGradeVisible(false), 500)

      const nextIndex = shotIndex + 1

      if (!isTrial) {
        try {
          localStorage.setItem(
            'arkalon_daily_strike_session',
            JSON.stringify({
              shotIndex: nextIndex,
              shots: resultsRef.current,
              inFlight: false,
              sessionStartTimestamp: sessionStartTimestampRef.current,
              date: new Date().toISOString().slice(0, 10)
            })
          )
        } catch {}
      }

      if (nextIndex >= data.shotCount) {
        finishedRef.current = true
        try {
          localStorage.removeItem('arkalon_daily_strike_session')
        } catch {}
        const totalElapsedMs = Math.round(
          performance.now() - sessionStartRef.current
        )
        const shots = resultsRef.current
        const perfectHits = shots.filter((s) => s.deviationPx < 5).length
        const excellentHits = shots.filter(
          (s) => s.deviationPx >= 5 && s.deviationPx < 15
        ).length
        const hits = shots.filter(
          (s) => s.deviationPx < s.targetWindowPx
        ).length
        const accuracyPct = Math.round((hits / shots.length) * 100)
        const avgDeviation = Math.round(
          shots.reduce((s, r) => s + r.deviationPx, 0) / shots.length
        )

        setTimeout(() => {
          onComplete({
            shots,
            totalElapsedMs,
            perfectHits,
            excellentHits,
            accuracyPct,
            avgDeviation,
            totalShots: shots.length
          })
        }, 800)
      } else {
        setTimeout(() => {
          isResolvingRef.current = false
          setShotIndex(nextIndex)
        }, 600)
      }
    },
    [
      currentShot,
      shotIndex,
      data.shotCount,
      isPaused,
      play,
      onComplete,
      isTrial
    ]
  )

  // Keyboard FIRE on Space or Enter
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        (e.key === ' ' || e.key === 'Enter') &&
        !isPaused &&
        !isStartingRef.current &&
        !isResolvingRef.current
      ) {
        e.preventDefault()
        handleFire()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleFire, isPaused])

  if (!currentShot) return null

  const targetLeft =
    (currentShot.targetCenterX - currentShot.targetWindowPx / 2) * scale
  const targetWidth = currentShot.targetWindowPx * scale

  return (
    <div className="mx-auto flex w-full max-w-155 flex-col gap-2.5 sm:gap-3.5">
      {isTrial && <TrialBanner />}

      {/* Shot counter */}
      <div className="flex items-center justify-between text-xs text-text-muted font-mono">
        <span>
          Shot {shotIndex + 1} of {data.shotCount}
        </span>
        <span
          className="font-bold tracking-wider uppercase text-[11px]"
          style={{
            color:
              data.motionFunction === 'deceptive'
                ? '#ff3b5c'
                : data.motionFunction === 'staccato'
                  ? '#00d4ff'
                  : data.motionFunction === 'pendulum'
                    ? '#a78bfa'
                    : data.motionFunction === 'erratic'
                      ? '#f59e0b'
                      : data.motionFunction === 'sinusoidal'
                        ? '#34d399'
                        : '#e8edf4'
          }}
        >
          {data.motionFunction}
        </span>
      </div>

      {/* Track */}
      <div className="relative w-full rounded-xl border border-border-subtle bg-surface-panel p-4 sm:p-6">
        <div
          ref={trackRef}
          className="relative mx-auto h-12 w-full overflow-visible rounded-sm bg-bg-base"
          style={{ maxWidth: `${TRACK_LOGICAL_WIDTH}px` }}
        >
          {/* Target zone */}
          <div
            className="absolute top-0 h-full rounded-sm bg-accent-recall/20 border border-accent-recall/40"
            style={{ left: targetLeft, width: targetWidth }}
            aria-hidden="true"
          />

          {/* Reticle */}
          <div
            ref={reticleElRef}
            className="absolute top-0 h-full w-0.5 bg-accent-recall"
            style={{ left: 0, transform: 'translateX(-50%)' }}
            aria-hidden="true"
          />

          {/* Grade flash */}
          {gradeVisible && lastGrade && (
            <div
              className="absolute -top-8 left-1/2 -translate-x-1/2 font-mono text-xs font-bold"
              style={{ color: gradeColor(lastGrade) }}
              aria-live="polite"
              aria-atomic="true"
            >
              {gradeName(lastGrade)}
            </div>
          )}
        </div>

        {/* FIRE button - thumb zone on mobile */}
        <div className="mt-5 sm:mt-8 flex justify-center">
          <button
            onClick={() => handleFire()}
            disabled={isPaused || isStarting}
            aria-label="Fire"
            className="min-h-14 sm:min-h-16 min-w-36 sm:min-w-40 rounded-xl border-2 border-accent-strike bg-accent-strike/10 px-8 py-3.5 sm:py-4 font-mono text-base sm:text-lg font-bold tracking-widest text-accent-strike transition-colors hover:bg-accent-strike/20 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent-strike active:bg-accent-strike/30 cursor-pointer"
          >
            FIRE
          </button>
        </div>

        {isStarting && (
          <StartCountdownOverlay
            onComplete={() => {
              shotStartRef.current = performance.now()
              sessionStartRef.current = performance.now()
              pausedMsRef.current = 0
              isStartingRef.current = false
              setIsStarting(false)
            }}
          />
        )}
        <PauseOverlay isPaused={isPaused} onResume={() => setIsPaused(false)} />
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted font-mono">
        <span className="text-[10px] sm:text-xs">
          <span className="hidden sm:inline">
            Space or Enter to fire &middot; Escape to pause
          </span>
          <span className="sm:hidden">Tap FIRE to strike</span>
        </span>
        <button
          onClick={() => setIsPaused(true)}
          aria-label="Pause game"
          className="rounded border border-border-subtle bg-surface-panel/80 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs text-text-muted hover:text-text-primary hover:border-accent-recall transition-colors cursor-pointer"
        >
          {'\u23F8'} Pause
        </button>
      </div>
    </div>
  )
}