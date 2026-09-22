'use client'

import { forwardRef } from 'react'
import { getScoreTierSolidColor } from '@/lib/format'
import { CATEGORIES } from '@/constants/categories'
import type { ShareResult } from '@/types/puzzle'

function FlameIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </svg>
  )
}

function GemIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
    </svg>
  )
}

// Visual performance strip - unique per category per Section 8.6.4
function PerformanceStrip({ result }: { result: ShareResult }) {
  switch (result.category) {
    case 'recall': {
      const rounds = result.metrics.rounds as
        | Array<{
            correctGlyphs: number
            sequenceLength: number
          }>
        | undefined
      if (!rounds) return null
      return (
        <div className="flex flex-col gap-1.5" aria-hidden="true">
          {rounds.map((round, ri) => (
            <div key={ri} className="flex flex-wrap gap-1">
              {Array.from({ length: round.sequenceLength }).map((_, i) => (
                <span
                  key={i}
                  className="inline-block h-4 w-4 rounded-sm"
                  style={{
                    backgroundColor:
                      i < round.correctGlyphs ? '#39ff8a' : '#f87171',
                    opacity: 0.9
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )
    }
    case 'surge': {
      const nodes = result.metrics.nodes as
        | Array<{
            reactionMs: number
            isDecoy: boolean
          }>
        | undefined
      if (!nodes) return null
      const filtered = nodes.filter((n) => !n.isDecoy).slice(0, 32)
      const maxReaction = Math.max(
        ...filtered.map((n) => n.reactionMs || 600),
        1
      )
      return (
        <div
          className="flex items-end gap-0.5"
          aria-hidden="true"
          style={{ height: 48 }}
        >
          {filtered.map((node, i) => {
            const isHit = node.reactionMs > 0
            const heightPct = isHit
              ? Math.max(0.15, 1 - node.reactionMs / maxReaction)
              : 0.05
            const color = !isHit
              ? '#f87171'
              : node.reactionMs < 150
                ? '#39ff8a'
                : node.reactionMs < 300
                  ? '#00d4ff'
                  : '#F59E0B'
            return (
              <div
                key={i}
                style={{
                  height: `${heightPct * 100}%`,
                  width: 6,
                  backgroundColor: color,
                  borderRadius: 2,
                  opacity: 0.9
                }}
              />
            )
          })}
        </div>
      )
    }
    case 'cipher': {
      const rounds = result.metrics.rounds as
        | Array<{
            correct: boolean
          }>
        | undefined
      // Reconstruct from correctRounds count if detailed rounds not available
      const correctRounds = (result.metrics.correctRounds as number) ?? 0
      const totalRounds = (result.metrics.totalRounds as number) ?? 0
      const items = Array.from({ length: totalRounds }).map(
        (_, i) => i < correctRounds
      )
      return (
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {items.map((correct, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span
                style={{
                  color: correct ? '#34d399' : '#f87171',
                  fontSize: 18,
                  lineHeight: 1
                }}
              >
                {correct ? '\u2713' : '\u2717'}
              </span>
              <span style={{ fontSize: 9, color: '#7c8ba1' }}>R{i + 1}</span>
            </div>
          ))}
        </div>
      )
    }
    case 'strike': {
      const shots = result.metrics.shots as
        | Array<{
            deviationPx: number
            targetWindowPx: number
          }>
        | undefined
      if (!shots) return null
      const gradeLabel = (dev: number, win: number) => {
        if (dev < 5) return 'P'
        if (dev < 15) return 'E'
        if (dev < win * 0.5) return 'G'
        if (dev < win) return 'L'
        return '\u25C7'
      }
      const gradeColor = (dev: number, win: number) => {
        if (dev < 5) return '#39ff8a'
        if (dev < 15) return '#00d4ff'
        if (dev < win * 0.5) return '#a78bfa'
        if (dev < win) return '#F59E0B'
        return '#7c8ba1'
      }
      return (
        <div className="flex flex-wrap gap-1.5" aria-hidden="true">
          {shots.map((shot, i) => (
            <span
              key={i}
              style={{
                color: gradeColor(shot.deviationPx, shot.targetWindowPx),
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              {gradeLabel(shot.deviationPx, shot.targetWindowPx)}
            </span>
          ))}
        </div>
      )
    }
    case 'depths': {
      const gridSize = (result.metrics.gridSize as number) ?? 5
      const foundPositions =
        (result.metrics.foundPositions as Array<{
          row: number
          col: number
        }>) ?? []
      const cellSize = Math.floor(80 / gridSize)
      return (
        <div aria-hidden="true" style={{ lineHeight: 0 }}>
          {Array.from({ length: gridSize }).map((_, r) => (
            <div key={r} style={{ display: 'flex' }}>
              {Array.from({ length: gridSize }).map((_, c) => {
                const isFound = foundPositions.some(
                  (p) => p.row === r && p.col === c
                )
                return (
                  <div
                    key={c}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      margin: 1,
                      borderRadius: 2,
                      backgroundColor: isFound ? '#4fc3ff' : '#22303f',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isFound && (
                      <span
                        style={{
                          fontSize: cellSize * 0.55,
                          color: '#4fc3ff',
                          display: 'inline-flex'
                        }}
                      >
                        <GemIcon />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )
    }
    default:
      return null
  }
}

interface ShareResultCardProps {
  result: ShareResult
}

// The share card component rendered offscreen before PNG capture.
// Fixed at 540x675px (half of 1080x1350 - html2canvas scales 2x).
export const ShareResultCard = forwardRef<HTMLDivElement, ShareResultCardProps>(
  function ShareResultCard({ result }, ref) {
  const cat = CATEGORIES[result.category]
  const tierColor = getScoreTierSolidColor(result.score)

    return (
      <div
        ref={ref}
        style={{
          width: 540,
          height: 675,
          backgroundColor: '#0a0e14',
          border: `2px solid ${cat.accentColor}33`,
          borderRadius: 16,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          position: 'fixed',
          left: -9999,
          top: -9999
        }}
        aria-hidden="true"
      >
        {/* Header */}
        <div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              color: '#00ff66',
              textTransform: 'uppercase',
              margin: 0
            }}
          >
            ARKALON DAILY
          </p>
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: cat.accentColor,
              margin: '4px 0 0',
              textTransform: 'uppercase'
            }}
          >
            {cat.displayName}
          </p>
        </div>

        {/* Performance strip */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            minHeight: 80
          }}
        >
          <PerformanceStrip result={result} />
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: 72,
              fontWeight: 700,
              fontFamily: 'monospace',
              margin: 0,
              lineHeight: 1,
              color: tierColor
            }}
          >
            {result.score}
          </p>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              color: '#7c8ba1',
              textTransform: 'uppercase',
              margin: '6px 0 0'
            }}
          >
            SCORE
          </p>
        </div>

        {/* Category + family index */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#7c8ba1', margin: 0 }}>
            {cat.displayName} #{result.familyIndex}
          </p>
          {result.streakDays >= 1 && (
            <p style={{ fontSize: 13, color: '#e8edf4', margin: '4px 0 0' }}>
              <span
                style={{
                  color: '#f59e0b',
                  display: 'inline-flex',
                  verticalAlign: '-2px'
                }}
              >
                <FlameIcon />
              </span>{' '}
              {result.streakDays}-day streak
            </p>
          )}
        </div>

        {/* Player + URL */}
        <p
          style={{
            fontSize: 11,
            color: '#7c8ba1',
            margin: 0,
            textAlign: 'center',
            letterSpacing: '0.05em'
          }}
        >
          {result.playerName} &middot; {result.url}
        </p>
      </div>
    )
  }
)
