'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { HelpCircle } from 'lucide-react'
import { TrialBanner } from '@/components/trial/TrialBanner'
import { useSound } from '@/hooks/useSound'
import { computeClueValue } from '@/lib/puzzles/compositionSystem'
import type {
  CrystalMineData,
  GridCell
} from '@/lib/puzzles/families/crystalMine'
import type { ClueTypeId } from '@/types/puzzle'

const CLUE_TYPE_INFO: Record<ClueTypeId, { name: string; detail: string }> = {
  numeric: {
    name: 'Numeric Distance',
    detail:
      'Numbers indicate how many steps away (up, down, left, right) the closest crystal is. Excavating an empty tile also pings its distance.'
  },
  directional: {
    name: 'Directional',
    detail:
      'Arrows (→, ↘, ↓, ↙, etc.) point in the 8 compass directions toward the closest crystal.'
  },
  hot_cold: {
    name: 'Hot & Cold',
    detail:
      'Clues show distance bands: HOT = 1 step away, WARM = 2-3 steps away, COLD = 4+ steps away from a crystal.'
  },
  adjacency_count: {
    name: 'Adjacency Count',
    detail:
      'Numbers reveal how many crystals are hidden in the 8 surrounding neighbor cells (orthogonal and diagonal).'
  }
}

export interface CrystalMineResult {
  depositsFound: number
  totalDeposits: number
  chargesUsed: number
  chargeLimit: number
  totalElapsedMs: number
  efficiencyPct: number
}

interface CrystalMineProps {
  data: CrystalMineData
  isTrial: boolean
  onComplete: (result: CrystalMineResult) => void
}

type CellState =
  | 'hidden'
  | 'clue'
  | 'deposit-found'
  | 'empty'
  | 'pre-revealed'
  | 'marked'
  | 'auto-revealed'

function getCellState(
  cell: GridCell,
  revealed: Set<string>,
  marked: Set<string>
): CellState {
  const key = `${cell.row},${cell.col}`
  if (cell.isClue) return 'clue'
  if (!revealed.has(key)) {
    if (marked.has(key)) return 'marked'
    return 'hidden'
  }
  if (cell.isDeposit) return 'deposit-found'
  return 'empty'
}

// Auto-scan reveal pacing when charges deplete with deposits still buried
const AUTO_REVEAL_STAGGER_MS = 140
const AUTO_REVEAL_VIEW_MS = 2200
interface SavedDepthsSession {
  fingerprint: string
  revealedKeys: string[]
  markedKeys?: string[]
  chargesUsed: number
  depositsFound: number
  elapsedMs?: number
  date: string
}

function getSavedDepthsSession(
  expectedFingerprint: string
): SavedDepthsSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('arkalon_daily_depths_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    if (parsed.date !== today) return null
    // Discard session if it belongs to a different puzzle layout or rotated seed
    if (parsed.fingerprint !== expectedFingerprint) {
      localStorage.removeItem('arkalon_daily_depths_session')
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function CrystalMine({ data, isTrial, onComplete }: CrystalMineProps) {
  const { play } = useSound()

  // Unique fingerprint identifies this exact board layout and seed
  const puzzleFingerprint = useMemo(() => {
    const rows = (data.rowCounts ?? []).join('')
    const cols = (data.colCounts ?? []).join('')
    return `${data.gridSize}_${data.depositCount}_${data.chargeLimit}_${data.clueType}_${rows}_${cols}`
  }, [data])

  const [savedSession] = useState(() =>
    isTrial ? null : getSavedDepthsSession(puzzleFingerprint)
  )
  const [isMarking, setIsMarking] = useState(false)
  const [marked, setMarked] = useState<Set<string>>(() => {
    if (savedSession?.markedKeys) {
      return new Set(savedSession.markedKeys)
    }
    return new Set()
  })
  const [activeSonarKey, setActiveSonarKey] = useState<string | null>(null)
  const [autoRevealKeys, setAutoRevealKeys] = useState<string[]>([])

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)

  // Track which non-clue cells have been excavated
  const [revealed, setRevealed] = useState<Set<string>>(() => {
    if (savedSession?.revealedKeys) {
      return new Set(savedSession.revealedKeys)
    }
    return new Set<string>()
  })

  const [chargesUsed, setChargesUsed] = useState(
    () => savedSession?.chargesUsed ?? 0
  )
  const [depositsFound, setDepositsFound] = useState(
    () => savedSession?.depositsFound ?? 0
  )
  const [finished, setFinished] = useState(false)
  const sessionStartRef = useRef(Date.now() - (savedSession?.elapsedMs ?? 0))

  const allDeposits = useMemo(() => {
    const list: { row: number; col: number }[] = []
    data.grid.forEach((row) =>
      row.forEach((c) => {
        if (c.isDeposit) list.push({ row: c.row, col: c.col })
      })
    )
    return list
  }, [data.grid])

  const colCounts = data.colCounts ?? []
  const rowCounts = data.rowCounts ?? []

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  const toggleMark = useCallback(
    (cell: GridCell) => {
      if (finished) return
      if (cell.isClue) return
      const key = `${cell.row},${cell.col}`
      if (revealed.has(key)) return
      const newMarked = new Set(marked)
      if (newMarked.has(key)) newMarked.delete(key)
      else {
        newMarked.add(key)
        play('sequence-tick')
      }
      setMarked(newMarked)
    },
    [finished, revealed, marked, play]
  )

  // Persist turn-based state to localStorage
  useEffect(() => {
    if (isTrial || finished) return
    try {
      localStorage.setItem(
        'arkalon_daily_depths_session',
        JSON.stringify({
          fingerprint: puzzleFingerprint,
          revealedKeys: Array.from(revealed),
          markedKeys: Array.from(marked),
          chargesUsed,
          depositsFound,
          elapsedMs: Date.now() - sessionStartRef.current,
          date: new Date().toISOString().slice(0, 10)
        })
      )
    } catch {
      // localStorage unavailable
    }
  }, [
    revealed,
    marked,
    chargesUsed,
    depositsFound,
    isTrial,
    finished,
    puzzleFingerprint
  ])

  useEffect(() => {
    if (isTrial || finished) return
    if (depositsFound >= data.depositCount || chargesUsed >= data.chargeLimit) {
      setFinished(true)
      try {
        localStorage.removeItem('arkalon_daily_depths_session')
      } catch {}
      const totalElapsedMs = Date.now() - sessionStartRef.current
      const wastedCharges = chargesUsed - depositsFound
      const maxWaste = data.chargeLimit - data.depositCount
      const efficiencyPct =
        maxWaste > 0
          ? Math.round(Math.max(0, (1 - wastedCharges / maxWaste) * 100))
          : depositsFound === data.depositCount
            ? 100
            : 0

      onComplete({
        depositsFound,
        totalDeposits: data.depositCount,
        chargesUsed,
        chargeLimit: data.chargeLimit,
        totalElapsedMs,
        efficiencyPct
      })
    }
  }, [depositsFound, chargesUsed, data, isTrial, finished, onComplete])

  const handleCellClick = useCallback(
    (cell: GridCell) => {
      if (finished) return
      if (longPressFiredRef.current) {
        longPressFiredRef.current = false
        return
      }
      if (cell.isClue) return
      const key = `${cell.row},${cell.col}`
      if (revealed.has(key)) return
      if (isMarking) {
        toggleMark(cell)
        return
      }

      const newCharges = chargesUsed + 1
      const newRevealed = new Set(revealed)
      newRevealed.add(key)

      let newDepositsFound = depositsFound
      if (cell.isDeposit) {
        play('crystal-found')
        newDepositsFound++
      } else {
        play('dig-empty')
        // Active Sonar: Reveal distance sensor from the excavated cell
        cell.isClue = true
        cell.clueValue = computeClueValue(
          cell.row,
          cell.col,
          allDeposits,
          'numeric',
          data.gridSize
        )
        setActiveSonarKey(key)
        setTimeout(() => setActiveSonarKey(null), 900)
      }

      setRevealed(newRevealed)
      setChargesUsed(newCharges)
      setDepositsFound(newDepositsFound)

      // End conditions: all deposits found or out of charges
      const allFound = newDepositsFound >= data.depositCount
      const outOfCharges = newCharges >= data.chargeLimit
      if (allFound || outOfCharges) {
        setFinished(true)
        try {
          localStorage.removeItem('arkalon_daily_depths_session')
        } catch {}
        const totalElapsedMs = Date.now() - sessionStartRef.current
        const wastedCharges = newCharges - newDepositsFound
        const maxWaste = data.chargeLimit - data.depositCount
        const efficiencyPct =
          maxWaste > 0
            ? Math.round(Math.max(0, (1 - wastedCharges / maxWaste) * 100))
            : newDepositsFound === data.depositCount
              ? 100
              : 0
        // Charges depleted with deposits still buried: auto-scan reveal so
        // every miss is visible before the result screen. Display-only -
        // depositsFound and the score are never touched by the reveal.
        const remaining = allFound
          ? []
          : allDeposits
              .filter((d) => !newRevealed.has(`${d.row},${d.col}`))
              .map((d) => `${d.row},${d.col}`)
        if (remaining.length > 0) {
          setAutoRevealKeys(remaining)
          play('incorrect')
        }
        const resultDelayMs =
          remaining.length > 0
            ? remaining.length * AUTO_REVEAL_STAGGER_MS +
              600 +
              AUTO_REVEAL_VIEW_MS
            : 600
        setTimeout(() => {
          onComplete({
            depositsFound: newDepositsFound,
            totalDeposits: data.depositCount,
            chargesUsed: newCharges,
            chargeLimit: data.chargeLimit,
            totalElapsedMs,
            efficiencyPct
          })
        }, resultDelayMs)
      }
    },
    [
      finished,
      revealed,
      chargesUsed,
      depositsFound,
      data,
      allDeposits,
      play,
      onComplete,
      isMarking,
      toggleMark,
    ]
  )

  const [showClueTooltip, setShowClueTooltip] = useState(false)
  const [viewport, setViewport] = useState({ w: 600, h: 800 })
  const clueTooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!showClueTooltip) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        clueTooltipRef.current &&
        !clueTooltipRef.current.contains(e.target as Node)
      ) {
        setShowClueTooltip(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showClueTooltip])

  const chargesRemaining = data.chargeLimit - chargesUsed

  // Height safeguard: force compact scale whenever vertical space is under 650px
  const isShortViewport = viewport.h < 650
  const compactCap = data.gridSize >= 7 ? 35 : data.gridSize === 6 ? 42 : 48
  const desktopCap = 58
  const upperCap = isShortViewport ? compactCap : desktopCap

  // Available height for grid after non-grid UI elements and margins
  const availableGridHeight = Math.max(200, viewport.h - 220)
  const maxCellByHeight =
    Math.floor((availableGridHeight - 16) / data.gridSize) - 4

  // Available width: clamp between mobile baseline (300px) and desktop max (380px)
  const maxGridContentWidth = Math.min(380, Math.max(300, viewport.w - 32))
  const maxCellByWidth = Math.floor(
    (maxGridContentWidth - data.gridSize * 4) / data.gridSize
  )

  const minCellFloor = data.gridSize >= 7 ? 34 : data.gridSize === 6 ? 38 : 44
  const cellSizePx = Math.max(
    minCellFloor,
    Math.min(upperCap, maxCellByHeight, maxCellByWidth)
  )

  const isLargeBoard = cellSizePx >= 48
  const rowHeaderWidth = isLargeBoard ? 32 : 24
  const gridPadding = isLargeBoard ? 24 : 12
  const gridTotalWidth =
    rowHeaderWidth + data.gridSize * (cellSizePx + 4) + gridPadding + 4

  const clueInfo = CLUE_TYPE_INFO[data.clueType] ?? {
    name: data.clueType.replace('_', ' '),
    detail: 'Use clue hints and row/column counts to deduce crystal locations.'
  }

  return (
    <div
      className="mx-auto flex w-full flex-col gap-1.5 sm:gap-2.5"
      style={{ maxWidth: `${gridTotalWidth}px` }}
    >
      {isTrial && <TrialBanner />}

      {/* Row 1: Objective Counters & Dig/Cross Toggle */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="flex items-center gap-1.5 font-bold text-text-primary whitespace-nowrap shrink-0">
          <span>{'\uD83D\uDD37'}</span>
          <span>
            {depositsFound}/{data.depositCount}
          </span>
        </span>

        <button
          onClick={() => setIsMarking((m) => !m)}
          className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
            isMarking
              ? 'border-text-muted/60 bg-surface-hover text-text-primary'
              : 'border-border-subtle bg-surface-panel text-text-muted hover:text-text-primary'
          }`}
        >
          {isMarking ? '✖ Cross' : '⛏️ Dig'}
        </button>

        <span className="font-mono text-xs whitespace-nowrap shrink-0 text-text-muted">
          Charges:{' '}
          <span
            className={`font-bold ${
              chargesRemaining <= 2 ? 'text-status-fail' : 'text-text-primary'
            }`}
          >
            {chargesRemaining}
          </span>
        </span>
      </div>

      {/* Row 2: Clue Type & Integrated Marking Hint */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
        <div
          className="relative flex items-center gap-1.5 shrink-0"
          ref={clueTooltipRef}
        >
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-mono">
            Clue:
          </span>
          <button
            type="button"
            onClick={() => setShowClueTooltip((v) => !v)}
            onMouseEnter={() => setShowClueTooltip(true)}
            onMouseLeave={() => setShowClueTooltip(false)}
            aria-label="Clue type explanation"
            className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border-subtle bg-surface-panel hover:border-accent-depths transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="font-bold uppercase text-[10px] sm:text-[11px] text-accent-depths tracking-wide font-mono">
              {clueInfo.name}
            </span>
            <HelpCircle
              size={11}
              className="text-text-muted group-hover:text-accent-depths transition-colors shrink-0"
            />
          </button>

          {showClueTooltip && (
            <div className="absolute left-0 top-full mt-1.5 z-40 w-72 sm:w-80 p-3 rounded-lg border border-accent-depths/50 bg-[#0c111a] shadow-2xl text-xs text-text-primary animate-[fade-in_0.15s_ease-out_both]">
              <p className="font-bold text-accent-depths font-mono mb-1">
                {clueInfo.name}
              </p>
              <p className="leading-relaxed text-text-muted text-[11px] mb-2 font-sans">
                {clueInfo.detail}
              </p>
              <p className="text-[10px] text-text-muted/80 border-t border-border-subtle/60 pt-1.5 font-mono">
                Border numbers show total crystals in each row and column.
              </p>
            </div>
          )}
        </div>

        <span className="text-[10px] sm:text-[11px] text-text-muted/70 truncate text-right">
          Hold tile to cross out (✖)
        </span>
      </div>
      {autoRevealKeys.length > 0 && (
        <p
          className="text-center text-xs font-mono font-bold text-[#F59E0B]"
          role="status"
          aria-live="polite"
        >
          ⚠️ Charges depleted · showing diamonds
        </p>
      )}

      {/* Seismic Matrix Grid with Outer Row & Column Counters */}
      <div
        className={`w-full rounded-xl border border-border-subtle bg-surface-panel p-1.5 sm:p-3${
          autoRevealKeys.length > 0 ? ' pointer-events-none' : ''
        }`}
        role="grid"
        aria-label="Crystal Mine grid"
        aria-rowcount={data.gridSize}
        aria-colcount={data.gridSize}
      >
        {/* Column Header Counters */}
        <div className="flex items-center mb-0.5 sm:mb-1">
          <div className="w-6 sm:w-8 shrink-0" aria-hidden="true" />
          {colCounts.map((count, ci) => (
            <div
              key={ci}
              style={{ width: cellSizePx }}
              className="text-center font-mono text-xs sm:text-base font-black m-0.5"
            >
              <span
                className={
                  count > 0
                    ? 'text-accent-depths drop-shadow-[0_0_8px_rgba(79,195,255,0.4)]'
                    : 'text-text-muted/35'
                }
              >
                {count}
              </span>
            </div>
          ))}
        </div>

        {data.grid.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="flex items-center"
            role="row"
            aria-rowindex={rowIdx + 1}
          >
            {/* Row Header Counter */}
            <div className="w-6 sm:w-8 shrink-0 text-right pr-1 sm:pr-2 font-mono text-xs sm:text-base font-black">
              <span
                className={
                  rowCounts[rowIdx] > 0
                    ? 'text-accent-depths drop-shadow-[0_0_8px_rgba(79,195,255,0.4)]'
                    : 'text-text-muted/35'
                }
              >
                {rowCounts[rowIdx] ?? 0}
              </span>
            </div>

            {row.map((cell) => {
              const key = `${cell.row},${cell.col}`
              const autoIndex = autoRevealKeys.indexOf(key)
              const state =
                autoIndex >= 0 && cell.isDeposit
                  ? 'auto-revealed'
                  : getCellState(cell, revealed, marked)
              const isSonarActive = activeSonarKey === key

              let bg = 'bg-bg-base hover:bg-border-subtle border-border-subtle'
              let textContent: React.ReactNode = null
              let ariaLabel = `Row ${cell.row + 1}, column ${cell.col + 1}`

              if (state === 'clue') {
                bg = isSonarActive
                  ? 'bg-accent-depths/20 border-accent-depths cursor-default'
                  : 'bg-surface-panel border-border-subtle cursor-default'
                textContent = (
                  <div className="relative flex items-center justify-center w-full h-full">
                    {isSonarActive && (
                      <span
                        className="absolute inset-0 rounded-full border-2 border-accent-depths pointer-events-none"
                        style={{
                          animation: 'sonar-ping 0.85s ease-out forwards'
                        }}
                      />
                    )}
                    <span className="font-mono text-sm sm:text-base font-bold text-accent-depths drop-shadow-[0_0_6px_rgba(79,195,255,0.7)]">
                      {String(cell.clueValue)}
                    </span>
                  </div>
                )
                ariaLabel += `, clue: ${cell.clueValue}`
              } else if (state === 'deposit-found') {
                bg = 'bg-accent-depths/20 border-accent-depths cursor-default'
                textContent = (
                  <span className="text-base sm:text-xl" aria-hidden="true">
                    {'\uD83D\uDD37'}
                  </span>
                )
                ariaLabel += ', deposit found'
              } else if (state === 'auto-revealed') {
                bg =
                  'bg-bg-base border-dashed border-text-muted/60 cursor-default'
                textContent = (
                  <span
                    className="text-base sm:text-xl opacity-40 grayscale"
                    aria-hidden="true"
                  >
                    {'\uD83D\uDD37'}
                  </span>
                )
                ariaLabel += ', revealed by auto-scan, not counted'
              } else if (state === 'empty') {
                bg =
                  'bg-border-subtle border-border-subtle cursor-default opacity-60'
                textContent = (
                  <span
                    className="text-xs sm:text-sm text-text-muted"
                    aria-hidden="true"
                  >
                    &times;
                  </span>
                )
                ariaLabel += ', excavated, empty'
              } else if (state === 'marked') {
                bg =
                  'bg-surface-panel/40 border-border-subtle cursor-pointer hover:border-text-muted/60'
                textContent = (
                  <span
                    className="text-xs sm:text-sm text-text-muted font-bold select-none"
                    aria-hidden="true"
                  >
                    ✖
                  </span>
                )
                ariaLabel += ', crossed out as empty'
              } else {
                ariaLabel += ', hidden'
              }

              const isInteractive =
                (state === 'hidden' || state === 'marked') && !finished

              return (
                <button
                  key={key}
                  role="gridcell"
                  aria-colindex={cell.col + 1}
                  aria-label={ariaLabel}
                  onClick={() => handleCellClick(cell)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    if (longPressFiredRef.current) return
                    toggleMark(cell)
                  }}
                  onPointerDown={() => {
                    longPressFiredRef.current = false
                    longPressTimerRef.current = setTimeout(() => {
                      longPressFiredRef.current = true
                      toggleMark(cell)
                    }, 450)
                  }}
                  onPointerUp={() => {
                    if (longPressTimerRef.current)
                      clearTimeout(longPressTimerRef.current)
                  }}
                  onPointerLeave={() => {
                    if (longPressTimerRef.current)
                      clearTimeout(longPressTimerRef.current)
                  }}
                  disabled={!isInteractive}
                  style={{
                    width: cellSizePx,
                    height: cellSizePx,
                    ...(autoIndex >= 0
                      ? {
                          animationDelay: `${autoIndex * AUTO_REVEAL_STAGGER_MS}ms`
                        }
                      : {})
                  }}
                  className={[
                    'flex items-center justify-center rounded border transition-colors m-0.5',
                    'focus-visible:outline-2 focus-visible:outline-accent-depths',
                    bg,
                    autoIndex >= 0
                      ? 'animate-[scan-reveal_0.5s_ease-out_both]'
                      : '',
                    isInteractive ? 'cursor-pointer' : 'cursor-default'
                  ].join(' ')}
                >
                  {textContent}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Charge bar */}
      <div className="w-full">
        <div className="mb-1 flex justify-between text-xs text-text-muted">
          <span>Charge budget</span>
          <span>
            {chargesUsed}/{data.chargeLimit}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
          <div
            className="h-full rounded-full bg-accent-depths transition-all"
            style={{ width: `${(chargesUsed / data.chargeLimit) * 100}%` }}
            role="progressbar"
            aria-valuenow={chargesUsed}
            aria-valuemin={0}
            aria-valuemax={data.chargeLimit}
            aria-label="Charges used"
          />
        </div>
      </div>
    </div>
  )
}
