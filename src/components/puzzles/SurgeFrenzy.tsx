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
  const scale = useScale(containerRef)

  const [savedSession] = useState(() =>
    isTrial ? null : getSavedSurgeSession()
  )
  const startWallTimeRef = useRef<number>(
    savedSession?.startWallTime ?? Date.now()
  )

  const [isPaused, setIsPaused] = useState(false)
  const [activeNodes, setActiveNodes] = useState<ActiveNode[]>([])

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

    onComplete({
      nodes: s.results,
      expectedNodeCount: data.expectedNodeCount,
      totalElapsedMs: Math.round(s.elapsedMs),
      avgReactionMs,
      correctTaps: hits.length,
      misses,
      bestCombo: s.bestCombo
    })
  }, [data.expectedNodeCount, onComplete])

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

  // Track pause time
  useEffect(() => {
    const s = stateRef.current
    if (isPaused) {
      s.pauseStartMs = performance.now()
    } else if (s.pauseStartMs > 0) {
      s.pausedMs += performance.now() - s.pauseStartMs
      s.pauseStartMs = 0
    }
  }, [isPaused])

  // Main rAF loop
  useEffect(() => {
    const s = stateRef.current
    const initialElapsed = isTrial
      ? 0
      : Math.max(0, Date.now() - startWallTimeRef.current)

    s.startMs = performance.now() - initialElapsed
    s.elapsedMs = initialElapsed

    if (savedSession) {
      s.results = [...savedSession.results]
      s.bestCombo = savedSession.bestCombo
      s.consecutiveHits = 0
    }

    if (initialElapsed >= data.sessionDurationMs) {
      while (s.results.length < data.nodes.length) {
        const node = data.nodes[s.results.length]
        s.results.push({
          reactionMs: 0,
          isDecoy: node.isDecoy,
          consecutiveHitsAtFire: 0
        })
      }
      finishSession()
      return
    }

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
      if (isPaused) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const elapsed = now - s.startMs - s.pausedMs
      s.elapsedMs = elapsed

      if (elapsed >= data.sessionDurationMs) {
        play('surge-end')
        // Session ended - expire remaining active nodes as misses
        setActiveNodes((prev) => {
          prev.forEach((n) => {
            s.results.push({
              reactionMs: 0,
              isDecoy: n.isDecoy,
              consecutiveHitsAtFire: 0
            })
          })
          return []
        })
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
            s.consecutiveHits = 0
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
            // Expired - miss
            s.results.push({
              reactionMs: 0,
              isDecoy: n.isDecoy,
              consecutiveHitsAtFire: 0
            })
            s.activeNodeIds.delete(n.id)
            s.consecutiveHits = 0
            continue
          }

          // Apply behavior mutations
          let radius = n.initialRadius
          let opacity = 1

          if (n.behavior === 'fading') opacity = 1 - progress
          if (n.behavior === 'shrinking')
            radius = n.initialRadius * (1 - progress * 0.5)
          if (n.behavior === 'growing')
            radius = n.initialRadius * (1 + progress)
          if (n.behavior === 'brief')
            opacity = progress > 0.5 ? 1 - (progress - 0.5) * 2 : 1

          alive.push({ ...n, currentRadius: radius, opacity })
        }
        return alive
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [data, isPaused, finishSession])

  const handleNodeTap = useCallback(
    (node: ActiveNode, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation()
      const s = stateRef.current
      if (s.finished || isPaused) return
      if (!s.activeNodeIds.has(node.id)) return

      const reactionMs = Math.round(s.elapsedMs - node.spawnAtMs)

      if (node.isDecoy) {
        play('decoy-hit')
        s.consecutiveHits = 0
        s.results.push({ reactionMs, isDecoy: true, consecutiveHitsAtFire: 0 })
      } else {
        play('node-hit')
        s.consecutiveHits++
        s.bestCombo = Math.max(s.bestCombo, s.consecutiveHits)
        s.results.push({
          reactionMs,
          isDecoy: false,
          consecutiveHitsAtFire: s.consecutiveHits - 1
        })
      }

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
    [isPaused, play, isTrial]
  )

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

  const progressPct = Math.min(
    100,
    (stateRef.current.elapsedMs / data.sessionDurationMs) * 100
  )

  return (
    <div className="flex w-full flex-col gap-3">
      {isTrial && <TrialBanner />}

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-border-subtle">
        <div
          className="h-full rounded-full bg-accent-surge transition-none"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Session progress"
        />
      </div>

      {/* Play area */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-panel"
        style={{ aspectRatio: '600 / 400', touchAction: 'none' }}
        aria-label="Surge Frenzy play area"
      >
        {activeNodes.map((node) => {
          const px = node.x * scale
          const py = node.y * scale
          const r = node.currentRadius * scale
          const color = node.isDecoy ? '#ff3b5c' : '#00d4ff'
          const minTapSize = SURGE_NODE_HIT_RADIUS_PX * scale
          const tapR = Math.max(r, minTapSize / 2)

          return (
            <button
              key={node.id}
              onClick={(e) => handleNodeTap(node, e)}
              onTouchStart={(e) => {
                handleNodeTap(node, e)
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

        <PauseOverlay isPaused={isPaused} onResume={() => setIsPaused(false)} />
      </div>

      {/* Controls hint */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Tap glowing nodes &middot; avoid red decoys</span>
        <button
          onClick={() => setIsPaused(true)}
          aria-label="Pause game"
          className="rounded px-2 py-1 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          {'\u23F8'} Pause
        </button>
      </div>
    </div>
  )
}
