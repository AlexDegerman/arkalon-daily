'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { TrialBanner } from '@/components/trial/TrialBanner'
import { useSound } from '@/hooks/useSound'
import type {
  CrystalMineData,
  GridCell
} from '@/lib/puzzles/families/crystalMine'

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

type CellState = 'hidden' | 'clue' | 'deposit-found' | 'empty' | 'pre-revealed'

function getCellState(cell: GridCell, revealed: Set<string>): CellState {
  const key = `${cell.row},${cell.col}`
  if (cell.isClue) return 'clue'
  if (!revealed.has(key)) return 'hidden'
  if (cell.isDeposit) return 'deposit-found'
  return 'empty'
}

export function CrystalMine({ data, isTrial, onComplete }: CrystalMineProps) {
  const { play } = useSound()

  // Track which non-clue cells have been excavated
  const [revealed, setRevealed] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    data.grid.flat().forEach((cell) => {
      if (cell.isRevealed && !cell.isClue) {
        initial.add(`${cell.row},${cell.col}`)
      }
    })
    return initial
  })

  const [chargesUsed, setChargesUsed] = useState(0)
  const [depositsFound, setDepositsFound] = useState(() => {
    // Count pre-revealed deposits
    return data.grid
      .flat()
      .filter((c) => c.isDeposit && c.isRevealed && !c.isClue).length
  })
  const [finished, setFinished] = useState(false)
  const sessionStartRef = useRef(Date.now())

  // Persist turn-based state to localStorage
  useEffect(() => {
    if (isTrial || finished) return
    try {
      localStorage.setItem(
        'arkalon_daily_depths_session',
        JSON.stringify({
          revealedKeys: Array.from(revealed),
          chargesUsed,
          depositsFound,
          date: new Date().toISOString().slice(0, 10)
        })
      )
    } catch {
      // localStorage unavailable
    }
  }, [revealed, chargesUsed, depositsFound, isTrial, finished])

  const handleCellClick = useCallback(
    (cell: GridCell) => {
      if (finished) return
      if (cell.isClue) return

      const key = `${cell.row},${cell.col}`
      if (revealed.has(key)) return

      const newCharges = chargesUsed + 1
      const newRevealed = new Set(revealed)
      newRevealed.add(key)

      let newDepositsFound = depositsFound
      if (cell.isDeposit) {
        play('deposit-found')
        newDepositsFound++
      } else {
        play('charge-spent')
      }

      setRevealed(newRevealed)
      setChargesUsed(newCharges)
      setDepositsFound(newDepositsFound)

      // End conditions: all deposits found or out of charges
      const allFound = newDepositsFound >= data.depositCount
      const outOfCharges = newCharges >= data.chargeLimit

      if (allFound || outOfCharges) {
        setFinished(true)
        const totalElapsedMs = Date.now() - sessionStartRef.current
        const wastedCharges = newCharges - newDepositsFound
        const maxWaste = data.chargeLimit - data.depositCount
        const efficiencyPct =
          maxWaste > 0
            ? Math.round(Math.max(0, (1 - wastedCharges / maxWaste) * 100))
            : newDepositsFound === data.depositCount
              ? 100
              : 0

        setTimeout(() => {
          onComplete({
            depositsFound: newDepositsFound,
            totalDeposits: data.depositCount,
            chargesUsed: newCharges,
            chargeLimit: data.chargeLimit,
            totalElapsedMs,
            efficiencyPct
          })
        }, 600)
      }
    },
    [finished, revealed, chargesUsed, depositsFound, data, play, onComplete]
  )

  const chargesRemaining = data.chargeLimit - chargesUsed
  const cellSizePx = Math.min(56, Math.floor(320 / data.gridSize))

  return (
    <div className="flex w-full flex-col gap-4">
      {isTrial && <TrialBanner />}

      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          {'\uD83D\uDD37'} {depositsFound}/{data.depositCount} found
        </span>
        <span>
          Charges:{' '}
          <span
            className={`font-mono font-bold ${
              chargesRemaining <= 2 ? 'text-status-fail' : 'text-text-primary'
            }`}
          >
            {chargesRemaining}
          </span>{' '}
          remaining
        </span>
      </div>

      {/* Clue type label */}
      <p className="text-xs text-text-muted">
        Clue type:{' '}
        <span className="font-semibold text-accent-depths capitalize">
          {data.clueType.replace('_', ' ')}
        </span>
      </p>

      {/* Grid */}
      <div
        className="mx-auto w-fit rounded-xl border border-border-subtle bg-surface-panel p-3"
        role="grid"
        aria-label="Crystal Mine grid"
        aria-rowcount={data.gridSize}
        aria-colcount={data.gridSize}
      >
        {data.grid.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="flex"
            role="row"
            aria-rowindex={rowIdx + 1}
          >
            {row.map((cell) => {
              const state = getCellState(cell, revealed)
              const key = `${cell.row},${cell.col}`

              let bg = 'bg-bg-base hover:bg-border-subtle border-border-subtle'
              let textContent: React.ReactNode = null
              let ariaLabel = `Row ${cell.row + 1}, column ${cell.col + 1}`

              if (state === 'clue') {
                bg = 'bg-surface-panel border-border-subtle cursor-default'
                textContent = (
                  <span className="font-mono text-xs font-bold text-accent-depths">
                    {String(cell.clueValue)}
                  </span>
                )
                ariaLabel += `, clue: ${cell.clueValue}`
              } else if (state === 'deposit-found') {
                bg = 'bg-accent-depths/20 border-accent-depths cursor-default'
                textContent = (
                  <span className="text-base" aria-hidden="true">
                    {'\uD83D\uDD37'}
                  </span>
                )
                ariaLabel += ', deposit found'
              } else if (state === 'empty') {
                bg =
                  'bg-border-subtle border-border-subtle cursor-default opacity-60'
                textContent = (
                  <span className="text-xs text-text-muted" aria-hidden="true">
                    &times;
                  </span>
                )
                ariaLabel += ', excavated, empty'
              } else {
                ariaLabel += ', hidden'
              }

              const isInteractive = state === 'hidden' && !finished

              return (
                <button
                  key={key}
                  role="gridcell"
                  aria-colindex={cell.col + 1}
                  aria-label={ariaLabel}
                  onClick={() => handleCellClick(cell)}
                  disabled={!isInteractive}
                  style={{ width: cellSizePx, height: cellSizePx }}
                  className={[
                    'flex items-center justify-center rounded border transition-colors m-0.5',
                    'focus-visible:outline-2 focus-visible:outline-accent-depths',
                    bg,
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
