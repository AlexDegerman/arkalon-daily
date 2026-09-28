import { describe, it, expect } from 'vitest'
import { buildDisplayMetrics } from '@/lib/displayMetrics'

describe('buildDisplayMetrics', () => {
  it('builds recall metrics from round data', () => {
    const metrics = {
      rounds: [
        { correctGlyphs: 3, sequenceLength: 3, errors: 0 },
        { correctGlyphs: 4, sequenceLength: 5, errors: 1 }
      ],
      totalElapsedMs: 15000
    }
    const result = buildDisplayMetrics('recall', metrics)
    expect(result.accuracyPercent).toBe(Math.round((7 / 8) * 100))
    expect(result.maxSequence).toBe(5)
    expect(result.errors).toBe(1)
    expect(result.completionTimeMs).toBe(15000)
  })

  it('builds surge metrics from node data', () => {
    const metrics = {
      nodes: [
        { reactionMs: 200, isDecoy: false, consecutiveHitsAtFire: 0 },
        { reactionMs: 0, isDecoy: false, consecutiveHitsAtFire: 0 },
        { reactionMs: 100, isDecoy: true, consecutiveHitsAtFire: 0 }
      ]
    }
    const result = buildDisplayMetrics('surge', metrics)
    expect(result.correctTaps).toBe(1)
    expect(result.misses).toBe(1)
    expect(result.avgReactionMs).toBe(200)
  })

  it('builds cipher metrics', () => {
    const metrics = {
      correctRounds: 3,
      totalRounds: 4,
      totalIncorrectGuesses: 1,
      avgResponseMs: 2500
    }
    const result = buildDisplayMetrics('cipher', metrics)
    expect(result.correctPct).toBe(75)
    expect(result.totalErrors).toBe(1)
  })

  it('builds strike metrics from shot data', () => {
    const metrics = {
      shots: [
        { deviationPx: 2, targetWindowPx: 50 },
        { deviationPx: 10, targetWindowPx: 50 },
        { deviationPx: 60, targetWindowPx: 50 }
      ]
    }
    const result = buildDisplayMetrics('strike', metrics)
    expect(result.perfectHits).toBe(1)
    expect(result.excellentHits).toBe(1)
    expect(result.accuracyPct).toBe(67) // 2 hits out of 3
    expect(result.totalShots).toBe(3)
  })

  it('builds depths metrics accounting for pre-revealed deposits', () => {
    const metrics = {
      depositsFound: 2,
      totalDeposits: 3,
      chargesUsed: 5,
      chargeLimit: 10,
      totalElapsedMs: 60000
    }
    const seedFamilyData = {
      gridSize: 5,
      grid: [
        [
          { row: 0, col: 0, isDeposit: true, isClue: false, isRevealed: true },
          { row: 0, col: 1, isDeposit: false, isClue: false, isRevealed: false }
        ]
      ]
    }
    const result = buildDisplayMetrics('depths', metrics, seedFamilyData)
    expect(result.depositsFound).toBe(2)
    expect(result.chargesUsed).toBe(5)
    expect(result.gridSize).toBe(5)
    expect(typeof result.efficiencyPct).toBe('number')
  })

  it('handles missing data gracefully without throwing', () => {
    const result = buildDisplayMetrics('recall', {})
    expect(result.accuracyPercent).toBe(0)
    expect(result.maxSequence).toBe(0)
  })
})
