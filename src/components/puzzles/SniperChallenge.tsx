'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { TrialBanner } from '@/components/trial/TrialBanner'
import { PauseOverlay } from '@/components/layout/PauseOverlay'
import { useSound } from '@/hooks/useSound'
import { calcReticleX } from '@/lib/puzzles/compositionSystem'
import type {
  SniperChallengeData,
  SniperShot
} from '@/lib/puzzles/families/sniperChallenge'
import type { MotionFunctionId } from '@/types/puzzle'

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

// Deceptive motion: approach target, fake-decelerate, then accelerate through
function calcDeceptiveX(
  tSec: number,
  targetCenterX: number,
  movementSpeed: number
): number {
  const v = movementSpeed * 200
  // Full pass takes trackWidth / v seconds - approximate one pass
  const passDuration = 600 / v
  const tInPass = tSec % passDuration
  const approachThreshold = (targetCenterX - 60) / v
  const deceptStart = approachThreshold
  const deceptEnd = deceptStart + 0.3 // 300ms decel phase
  const reverseEnd = deceptEnd + 0.2 // 200ms reverse phase

  if (tInPass < deceptStart) {
    return v * tInPass
  } else if (tInPass < deceptEnd) {
    // Decelerate to 30% speed
    const dt = tInPass - deceptStart
    return targetCenterX - 60 + v * 0.3 * dt
  } else if (tInPass < reverseEnd) {
    // Brief reverse
    const dt = tInPass - deceptEnd
    const deceptPos = targetCenterX - 60 + v * 0.3 * (deceptEnd - deceptStart)
    return deceptPos - v * 0.5 * dt
  } else {
    // Accelerate through at 1.5x
    const dt = tInPass - reverseEnd
    const reversePos =
      targetCenterX -
      60 +
      v * 0.3 * (deceptEnd - deceptStart) -
      v * 0.5 * (reverseEnd - deceptEnd)
    return Math.min(600, reversePos + v * 1.5 * dt)
  }
}

interface SniperChallengeProps {
  data: SniperChallengeData
  isTrial: boolean
  onComplete: (result: SniperChallengeResult) => void
}

const TRACK_LOGICAL_WIDTH = 600

export function SniperChallenge({
  data,
  isTrial,
  onComplete
}: SniperChallengeProps) {
  const { play } = useSound()
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

  const [shotIndex, setShotIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [lastGrade, setLastGrade] = useState<ShotGrade | null>(null)
  const [gradeVisible, setGradeVisible] = useState(false)

  const rafRef = useRef<number>(0)
  const shotStartRef = useRef<number>(0)
  const pausedMsRef = useRef<number>(0)
  const pauseStartRef = useRef<number>(0)
  const reticleXRef = useRef<number>(0)
  const reticleElRef = useRef<HTMLDivElement>(null)
  const sessionStartRef = useRef<number>(0)
  const resultsRef = useRef<SniperChallengeResult['shots']>([])
  const finishedRef = useRef(false)

  const currentShot: SniperShot | undefined = data.shots[shotIndex]

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
  }, [shotIndex])

  // rAF loop - only updates the reticle DOM element directly to avoid React re-renders
  useEffect(() => {
    if (!currentShot || finishedRef.current) return

    function tick(now: number) {
      if (finishedRef.current) return
      if (isPaused) {
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

      // Auto-miss if reticle completes one full traversal without FIRE
      if (tMs > (TRACK_LOGICAL_WIDTH / (data.movementSpeed * 200)) * 2500) {
        handleFire(true)
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [shotIndex, isPaused, currentShot, data, scale])

  const handleFire = useCallback(
    (autoMiss = false) => {
      if (finishedRef.current || isPaused || !currentShot) return
      cancelAnimationFrame(rafRef.current)

      const reticleX = autoMiss ? -9999 : reticleXRef.current
      const deviationPx = Math.abs(reticleX - currentShot.targetCenterX)
      const grade = getGrade(deviationPx, currentShot.targetWindowPx)

      if (!autoMiss) {
        if (grade === 'perfect') play('perfect-shot')
        else if (grade === 'miss') play('incorrect')
        else play('correct')
      }

      resultsRef.current.push({
        deviationPx: autoMiss ? currentShot.targetWindowPx * 2 : deviationPx,
        targetWindowPx: currentShot.targetWindowPx
      })

      setLastGrade(autoMiss ? 'miss' : grade)
      setGradeVisible(true)
      setTimeout(() => setGradeVisible(false), 500)

      const nextIndex = shotIndex + 1
      if (nextIndex >= data.shotCount) {
        finishedRef.current = true
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
        onComplete({
          shots,
          totalElapsedMs,
          perfectHits,
          excellentHits,
          accuracyPct,
          avgDeviation,
          totalShots: shots.length
        })
      } else {
        setTimeout(() => setShotIndex(nextIndex), 600)
      }
    },
    [currentShot, shotIndex, data.shotCount, isPaused, play, onComplete]
  )

  // Keyboard FIRE on Space or Enter
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === ' ' || e.key === 'Enter') && !isPaused) {
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
    <div className="flex w-full flex-col gap-4">
      {isTrial && <TrialBanner />}

      {/* Shot counter */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          Shot {shotIndex + 1} of {data.shotCount}
        </span>
        <span
          style={{
            color: data.motionFunction === 'deceptive' ? '#ff3b5c' : undefined
          }}
        >
          {data.motionFunction.charAt(0).toUpperCase() +
            data.motionFunction.slice(1)}
        </span>
      </div>

      {/* Track */}
      <div className="relative w-full rounded-xl border border-border-subtle bg-surface-panel p-6">
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
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => handleFire()}
            disabled={isPaused}
            aria-label="Fire"
            className="min-h-16 min-w-40 rounded-xl border-2 border-accent-strike bg-accent-strike/10 px-8 py-4 font-mono text-lg font-bold tracking-widest text-accent-strike transition-colors hover:bg-accent-strike/20 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent-strike active:bg-accent-strike/30"
          >
            FIRE
          </button>
        </div>

        <PauseOverlay isPaused={isPaused} onResume={() => setIsPaused(false)} />
      </div>

      <p className="text-center text-xs text-text-muted">
        Space or Enter to fire &mdash; Escape to pause
      </p>
    </div>
  )
}
