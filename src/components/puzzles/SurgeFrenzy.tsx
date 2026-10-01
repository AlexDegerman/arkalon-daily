'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { TrialBanner } from '@/components/trial/TrialBanner'
import { PauseOverlay } from '@/components/layout/PauseOverlay'
import { useSound } from '@/hooks/useSound'
import { usePuzzleStore } from '@/app/stores/puzzleStore'
import {
  SURGE_MAX_SIMULTANEOUS_NODES,
  SURGE_NODE_HIT_RADIUS_PX
} from '@/lib/puzzles/compositionSystem'
import type {
  SurgeFrenzyData,
  SurgeNode
} from '@/lib/puzzles/families/surgeFrenzy'
import { StartCountdownOverlay } from '@/components/layout/StartCountdownOverlay'

export interface SurgeFrenzyResult {
  nodes: {
    reactionMs: number
    isDecoy: boolean
    consecutiveHitsAtFire: number
  }[]
  expectedNodeCount: number
  totalElapsedMs: number
  avgReactionMs: number
  correctTaps: number
  misses: number
  bestCombo: number
}

interface ActiveNode extends SurgeNode {
  expiresAtMs: number
  currentRadius: number
  opacity: number
  currentX?: number
  currentY?: number
}

interface FloatingGrade {
  id: number
  x: number
  y: number
  label: string
  cls: string
}

interface SurgeFrenzyProps {
  data: SurgeFrenzyData
  isTrial: boolean
  onComplete: (result: SurgeFrenzyResult) => void
}

// Scale factor converts logical 600x400 units to actual canvas px
function useScale(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 600
      setScale(w / 600)
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [containerRef])
  return scale
}

interface SavedSurgeSession {
  startWallTime: number
  results: SurgeFrenzyResult['nodes']
  bestCombo: number
  date: string
}

function getSavedSurgeSession(): SavedSurgeSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('arkalon_daily_surge_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    if (parsed.date !== today) return null
    return parsed
  } catch {
    return null
  }
}

export function SurgeFrenzy({ data, isTrial, onComplete }: SurgeFrenzyProps) {
  const { play } = useSound()
  const pauseSignal = usePuzzleStore((s) => s.pauseSignal)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const scale = useScale(containerRef)

  const [savedSession] = useState(() =>
    isTrial ? null : getSavedSurgeSession()
  )
  const startWallTimeRef = useRef<number>(savedSession?.startWallTime ?? 0)

  const [isPaused, setIsPaused] = useState(false)
  const [isCountingDown, setIsCountingDown] = useState(() => !savedSession)
  const [activeNodes, setActiveNodes] = useState<ActiveNode[]>([])
  const [currentCombo, setCurrentCombo] = useState(0)
  const [floatingGrades, setFloatingGrades] = useState<FloatingGrade[]>([])

  // Mutable game state that does not need to trigger re-renders each frame
  const stateRef = useRef({
    startMs: 0,
    pausedMs: 0, // total ms spent paused
    pauseStartMs: 0,
    elapsedMs: 0,
    nextSpawnIndex: 0,
    consecutiveHits: 0,
    bestCombo: savedSession?.bestCombo ?? 0,
    results: (savedSession?.results
      ? [...savedSession.results]
      : []) as SurgeFrenzyResult['nodes'],
    activeNodeIds: new Set<number>(),
    finished: false
  })

  const rafRef = useRef<number>(0)

  const finishSession = useCallback(() => {
    const s = stateRef.current
    if (s.finished) return
    s.finished = true
    cancelAnimationFrame(rafRef.current)
    try {
      localStorage.removeItem('arkalon_daily_surge_session')
    } catch {}

    // Ensure all unhandled nodes are resolved as misses so AFK submissions never fail payload validation
    const resolvedCount = s.results.length
    for (let i = resolvedCount; i < data.nodes.length; i++) {
      const node = data.nodes[i]
      s.results.push({
        reactionMs: 0,
        isDecoy: node.isDecoy,
        consecutiveHitsAtFire: 0
      })
    }

    const hits = s.results.filter((n) => !n.isDecoy && n.reactionMs > 0)
    const misses = s.results.filter(
      (n) => !n.isDecoy && n.reactionMs === 0
    ).length
    const avgReactionMs =
      hits.length > 0
        ? Math.round(
            hits.reduce((sum, n) => sum + n.reactionMs, 0) / hits.length
          )
        : 0

    const safeElapsedMs = Math.max(
      0,
      Math.round(s.elapsedMs || data.sessionDurationMs)
    )

    onComplete({
      nodes: s.results,
      expectedNodeCount: Math.max(1, data.expectedNodeCount),
      totalElapsedMs: safeElapsedMs,
      avgReactionMs,
      correctTaps: hits.length,
      misses,
      bestCombo: s.bestCombo
    })
  }, [data.expectedNodeCount, data.nodes, data.sessionDurationMs, onComplete])

  useEffect(() => {
    if (pauseSignal > 0) setIsPaused(true)
  }, [pauseSignal])
  // Pause on tab hidden
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && !stateRef.current.finished) {
        setIsPaused(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Escape to pause
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !stateRef.current.finished) {
        setIsPaused((p) => !p)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const isPausedRef = useRef(isPaused)
  isPausedRef.current = isPaused

  // Track pause time
  useEffect(() => {
    const s = stateRef.current
    if (isPaused) {
      s.pauseStartMs = performance.now()
    } else if (s.pauseStartMs > 0) {
      const pausedDuration = performance.now() - s.pauseStartMs
      s.pausedMs += pausedDuration
      // Only shift the wall-clock anchor when the session has actually started
      // (startMs is set by the rAF effect after countdown). Guarding here
      // prevents a pause during the 3-2-1 countdown from corrupting the anchor.
      if (s.startMs > 0 && startWallTimeRef.current > 0) {
        startWallTimeRef.current += pausedDuration
      }
      s.pauseStartMs = 0
    }
  }, [isPaused])

  // Main rAF loop: only runs after countdown completes
  useEffect(() => {
    if (isCountingDown) return

    const s = stateRef.current
    if (startWallTimeRef.current === 0) {
      startWallTimeRef.current = Date.now()
    }

    const initialElapsed = isTrial
      ? 0
      : Math.max(0, Date.now() - startWallTimeRef.current)

    s.startMs = performance.now() - initialElapsed
    s.elapsedMs = initialElapsed
    // initialElapsed already excludes pause time (startWallTimeRef was
    // shifted on each unpause). Reset pausedMs so the rAF loop does not
    // subtract the same pause duration a second time.
    s.pausedMs = 0

    if (savedSession) {
      s.results = [...savedSession.results]
      s.bestCombo = savedSession.bestCombo
      s.consecutiveHits = 0
    }

    if (initialElapsed >= data.sessionDurationMs) {
      finishSession()
      return
    }

    // Fast-forward missed nodes if resuming mid-session
    if (initialElapsed > 0) {
      const initialActive: ActiveNode[] = []
      let i = s.results.length
      while (
        i < data.nodes.length &&
        data.nodes[i].spawnAtMs <= initialElapsed
      ) {
        const node = data.nodes[i]
        if (node.spawnAtMs + node.lifetimeMs <= initialElapsed) {
          s.results.push({
            reactionMs: 0,
            isDecoy: node.isDecoy,
            consecutiveHitsAtFire: 0
          })
        } else {
          s.activeNodeIds.add(node.id)
          const age = initialElapsed - node.spawnAtMs
          const progress = age / node.lifetimeMs
          let radius = node.initialRadius
          let opacity = 1

          if (node.behavior === 'fading') opacity = 1 - progress
          if (node.behavior === 'shrinking')
            radius = node.initialRadius * (1 - progress * 0.5)
          if (node.behavior === 'growing')
            radius = node.initialRadius * (1 + progress)
          if (node.behavior === 'brief')
            opacity = progress > 0.5 ? 1 - (progress - 0.5) * 2 : 1

          initialActive.push({
            ...node,
            expiresAtMs: node.spawnAtMs + node.lifetimeMs,
            currentRadius: radius,
            opacity
          })
        }
        i++
      }
      s.nextSpawnIndex = i
      setActiveNodes(initialActive)
    }

    function tick(now: number) {
      if (s.finished) return
      if (isPausedRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const elapsed = now - s.startMs - s.pausedMs
      s.elapsedMs = elapsed
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${Math.min(100, (elapsed / data.sessionDurationMs) * 100)}%`
      }

      if (elapsed >= data.sessionDurationMs) {
        play('surge-end')
        setActiveNodes([])
        finishSession()
        return
      }

      // Spawn new nodes
      while (
        s.nextSpawnIndex < data.nodes.length &&
        data.nodes[s.nextSpawnIndex].spawnAtMs <= elapsed
      ) {
        const node = data.nodes[s.nextSpawnIndex]
        s.nextSpawnIndex++
        s.activeNodeIds.add(node.id)
        setActiveNodes((prev) => {
          // Enforce max simultaneous nodes - expire the oldest if at limit
          let next = [...prev]
          if (next.length >= SURGE_MAX_SIMULTANEOUS_NODES) {
            const oldest = next[0]
            // Record as miss
            s.results.push({
              reactionMs: 0,
              isDecoy: oldest.isDecoy,
              consecutiveHitsAtFire: 0
            })
            s.activeNodeIds.delete(oldest.id)
            if (!oldest.isDecoy) {
              s.consecutiveHits = 0
              setCurrentCombo(0)
            }
            next = next.slice(1)
          }
          return [
            ...next,
            {
              ...node,
              expiresAtMs: node.spawnAtMs + node.lifetimeMs,
              currentRadius: node.initialRadius,
              opacity: 1
            }
          ]
        })
      }

      // Update active nodes - expire any that have timed out
      setActiveNodes((prev) => {
        const alive: ActiveNode[] = []
        for (const n of prev) {
          const age = elapsed - n.spawnAtMs
          const progress = age / n.lifetimeMs

          if (progress >= 1) {
            s.results.push({
              reactionMs: 0,
              isDecoy: n.isDecoy,
              consecutiveHitsAtFire: 0
            })
            s.activeNodeIds.delete(n.id)
            if (!n.isDecoy) {
              s.consecutiveHits = 0
              setCurrentCombo(0)
            }
            continue
          }

          // Apply behavior mutations
          let radius = n.initialRadius
          let opacity = 1
          let currentX = n.x
          let currentY = n.y

          if (data.spawnPattern === 'spiral') {
            const dx = n.x - 300
            const dy = n.y - 200
            const dist = Math.hypot(dx, dy)
            const angle = Math.atan2(dy, dx) + progress * 1.4
            const r = Math.max(20, dist * (1 - progress * 0.35))
            currentX = 300 + r * Math.cos(angle)
            currentY = 200 + r * Math.sin(angle)
          } else if (data.spawnPattern === 'wave') {
            currentY = n.y + 30 * Math.sin(progress * Math.PI * 2)
          } else if (n.behavior === 'moving') {
            currentX = n.x + 35 * progress
          }

          if (n.behavior === 'fading') opacity = 1 - progress
          if (n.behavior === 'shrinking')
            radius = n.initialRadius * (1 - progress * 0.5)
          if (n.behavior === 'growing')
            radius = n.initialRadius * (1 + progress)
          if (n.behavior === 'brief')
            opacity = progress > 0.5 ? 1 - (progress - 0.5) * 2 : 1

          alive.push({
            ...n,
            currentRadius: radius,
            currentX,
            currentY,
            opacity
          })
        }
        return alive
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [data, isCountingDown, finishSession, isTrial, savedSession])

  const hoveredNodeRef = useRef<ActiveNode | null>(null)

  const handleNodeTap = useCallback(
    (node: ActiveNode, e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation()
      const s = stateRef.current
      if (s.finished || isPaused) return
      if (!s.activeNodeIds.has(node.id)) return

      const reactionMs = Math.max(0, Math.round(s.elapsedMs - node.spawnAtMs))
      const px = (node.currentX ?? node.x) * scale
      const py = (node.currentY ?? node.y) * scale

      let gradeLabel = 'LATE'
      let gradeCls = 'g-vg'

      if (node.isDecoy) {
        play('decoy-hit')
        s.consecutiveHits = 0
        setCurrentCombo(0)
        gradeLabel = 'DECOY -2'
        gradeCls = 'text-status-fail font-mono font-black'
        s.results.push({ reactionMs, isDecoy: true, consecutiveHitsAtFire: 0 })
      } else {
        // Dynamic pitch shifting: audio pitches up as combo climbs
        const pitchMultiplier = 1.0 + Math.min(s.consecutiveHits * 0.025, 0.5)
        play('node-hit', { playbackRate: pitchMultiplier })
        s.consecutiveHits++

        if (reactionMs < 300) {
          gradeLabel = 'PERFECT'
          gradeCls = 'g-ntg font-mono font-black'
        } else if (reactionMs < 450) {
          gradeLabel = 'FAST'
          gradeCls = 'title-surge font-mono font-black'
        } else if (reactionMs < 650) {
          gradeLabel = 'GOOD'
          gradeCls = 'text-[#a78bfa] font-mono font-bold'
        } else if (reactionMs < 900) {
          gradeLabel = 'OK'
          gradeCls = 'text-[#60a5fa] font-mono font-bold'
        }

        s.bestCombo = Math.max(s.bestCombo, s.consecutiveHits)
        setCurrentCombo(s.consecutiveHits)
        s.results.push({
          reactionMs,
          isDecoy: false,
          consecutiveHitsAtFire: Math.max(0, s.consecutiveHits - 1)
        })
      }

      // Spawn floating feedback tag at tap point
      const gradeId = Math.random()
      setFloatingGrades((prev) => [
        ...prev,
        { id: gradeId, x: px, y: py, label: gradeLabel, cls: gradeCls }
      ])
      setTimeout(() => {
        setFloatingGrades((prev) => prev.filter((g) => g.id !== gradeId))
      }, 400)

      s.activeNodeIds.delete(node.id)
      setActiveNodes((prev) => prev.filter((n) => n.id !== node.id))

      if (!isTrial) {
        try {
          localStorage.setItem(
            'arkalon_daily_surge_session',
            JSON.stringify({
              startWallTime: startWallTimeRef.current,
              results: s.results,
              bestCombo: s.bestCombo,
              date: new Date().toISOString().slice(0, 10)
            })
          )
        } catch {}
      }
    },
    [isPaused, play, isTrial, scale]
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.repeat || isPaused || isCountingDown) return
      const key = e.key.toLowerCase()
      if (key === 'z' || key === 'x' || key === ' ' || e.code === 'Space') {
        e.preventDefault()
        const target = hoveredNodeRef.current
        if (target && stateRef.current.activeNodeIds.has(target.id)) {
          handleNodeTap(target)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPaused, isCountingDown, handleNodeTap])

  useEffect(() => {
    if (isTrial) return
    const persist = () => {
      const s = stateRef.current
      if (s.finished) return
      try {
        localStorage.setItem(
          'arkalon_daily_surge_session',
          JSON.stringify({
            startWallTime: startWallTimeRef.current,
            results: s.results,
            bestCombo: s.bestCombo,
            date: new Date().toISOString().slice(0, 10)
          })
        )
      } catch {}
    }
    window.addEventListener('beforeunload', persist)
    return () => window.removeEventListener('beforeunload', persist)
  }, [isTrial])

  return (
    <div className="flex w-full flex-col gap-3">
      {isTrial && <TrialBanner />}

      <div className="flex items-center justify-between text-xs text-text-muted font-mono">
        <span className="font-bold tracking-wider uppercase text-[11px] text-accent-surge">
          {data.spawnPattern.replace(/_/g, ' ')}
        </span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">
          {data.timingProfile.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Telemetry Bar: Progress + Live Combo HUD */}
      <div className="flex items-center justify-between gap-3 text-xs font-mono">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border-subtle">
          <div
            ref={progressBarRef}
            className="h-full rounded-full bg-accent-surge"
            style={{ width: '0%' }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Session progress"
          />
        </div>

        {/* Live Combo HUD */}
        <div className="shrink-0 flex items-center min-w-16 justify-end">
          {currentCombo >= 5 ? (
            <span className="flex items-center gap-1 font-black g-ttr animate-pulse text-[11px]">
              <span>🔥</span>
              <span>{currentCombo} COMBO</span>
              {currentCombo >= 10 && (
                <span className="text-[9px] text-accent-surge font-bold">
                  (1.5x)
                </span>
              )}
            </span>
          ) : currentCombo > 0 ? (
            <span className="text-text-muted font-bold text-[10px]">
              {currentCombo} COMBO
            </span>
          ) : (
            <span className="text-text-muted/40 text-[10px]">NO COMBO</span>
          )}
        </div>
      </div>

      {/* Play area */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-panel"
        style={{ aspectRatio: '600 / 400', touchAction: 'none' }}
        aria-label="Surge Frenzy play area"
      >
        {data.spawnPattern === 'lane_switch' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-around py-8 opacity-25">
            <div className="border-b border-dashed border-accent-surge w-full" />
            <div className="border-b border-dashed border-accent-surge w-full" />
            <div className="border-b border-dashed border-accent-surge w-full" />
          </div>
        )}

        {/* Floating in-the-moment reaction grade tags */}
        {floatingGrades.map((g) => (
          <span
            key={g.id}
            style={{ left: g.x, top: g.y }}
            className={`absolute pointer-events-none text-xs select-none z-20 animate-[pop-float_0.4s_ease-out_forwards] ${g.cls}`}
          >
            {g.label}
          </span>
        ))}

        {activeNodes.map((node) => {
          const px = (node.currentX ?? node.x) * scale
          const py = (node.currentY ?? node.y) * scale
          // Floor visual radius to at least 16px (32px diameter) so orbs remain easily visible on mobile
          const r = Math.max(16, node.currentRadius * scale)
          const color = node.isDecoy ? '#ff3b5c' : '#00d4ff'
          // Enforce 48px minimum physical tap target on all viewports (Apple/Android touch standard)
          const minPhysicalTapTargetPx = 48
          const tapR = Math.max(r, minPhysicalTapTargetPx / 2)

          return (
            <button
              key={node.id}
              data-node-id={node.id}
              onPointerDown={(e) => handleNodeTap(node, e)}
              onPointerEnter={() => {
                hoveredNodeRef.current = node
              }}
              onPointerLeave={() => {
                if (hoveredNodeRef.current?.id === node.id) {
                  hoveredNodeRef.current = null
                }
              }}
              aria-label={node.isDecoy ? 'Decoy node - avoid' : 'Tap node'}
              style={{
                position: 'absolute',
                left: px - tapR,
                top: py - tapR,
                width: tapR * 2,
                height: tapR * 2,
                borderRadius: '50%',
                border: `2px solid ${color}`,
                backgroundColor: `${color}22`,
                opacity: node.opacity,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="focus-visible:outline-2 focus-visible:outline-accent-surge"
            >
              <span
                style={{
                  width: r * 2,
                  height: r * 2,
                  borderRadius: '50%',
                  backgroundColor: color,
                  opacity: 0.7,
                  display: 'block'
                }}
                aria-hidden="true"
              />
            </button>
          )
        })}

        {isCountingDown && (
          <StartCountdownOverlay onComplete={() => setIsCountingDown(false)} />
        )}
        <PauseOverlay isPaused={isPaused} onResume={() => setIsPaused(false)} />
      </div>

      {/* Controls hint */}
      <div className="relative flex items-center justify-between text-xs text-text-muted">
        <span className="text-[11px] truncate max-w-[55%]">
          Tap nodes (or Space / Z / X) &middot; avoid red decoys
        </span>

        <div className="absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => setIsPaused(true)}
            aria-label="Pause game"
            className="flex items-center gap-1 rounded border border-border-subtle bg-surface-panel/80 px-2.5 py-1 text-[11px] font-mono hover:border-accent-recall transition-colors cursor-pointer"
          >
            <span>{'\u23F8'}</span>
            <span>Pause</span>
          </button>
        </div>

        <span className="text-[10px] text-text-muted/60 font-mono hidden sm:inline">
          Esc to pause
        </span>
      </div>
    </div>
  )
}
