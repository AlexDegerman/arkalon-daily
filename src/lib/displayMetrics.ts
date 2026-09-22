import type { PuzzleCategory } from '@/types/puzzle'

// Single source of truth for result-screen display metrics. Used both on
// fresh submission and when reloading a stored attempt, so a revisited
// score card renders identically to the original.
export function buildDisplayMetrics(
  category: PuzzleCategory,
  metrics: Record<string, unknown>,
  seedFamilyData?: Record<string, unknown>
): Record<string, unknown> {
  switch (category) {
    case 'recall': {
      const rounds =
        (metrics.rounds as Array<{
          correctGlyphs: number
          sequenceLength: number
          errors: number
        }>) ?? []
      const total = rounds.reduce((s, r) => s + r.sequenceLength, 0)
      const correct = rounds.reduce((s, r) => s + r.correctGlyphs, 0)
      return {
        accuracyPercent: total > 0 ? Math.round((correct / total) * 100) : 0,
        maxSequence:
          rounds.length > 0
            ? Math.max(...rounds.map((r) => r.sequenceLength))
            : 0,
        errors: rounds.reduce((s, r) => s + r.errors, 0),
        completionTimeMs: metrics.totalElapsedMs,
        rounds
      }
    }
    case 'surge': {
      const nodes =
        (metrics.nodes as Array<{
          reactionMs: number
          isDecoy: boolean
          consecutiveHitsAtFire: number
        }>) ?? []
      const hits = nodes.filter((n) => !n.isDecoy && n.reactionMs > 0)
      const misses = nodes.filter(
        (n) => !n.isDecoy && n.reactionMs === 0
      ).length
      return {
        avgReactionMs:
          hits.length > 0
            ? Math.round(
                hits.reduce((sum, n) => sum + n.reactionMs, 0) / hits.length
              )
            : 0,
        correctTaps: hits.length,
        misses,
        bestCombo: hits.reduce(
          (max, n) => Math.max(max, n.consecutiveHitsAtFire + 1),
          0
        ),
        nodes
      }
    }
    case 'cipher': {
      const correctRounds = (metrics.correctRounds as number) ?? 0
      const totalRounds = (metrics.totalRounds as number) ?? 1
      return {
        correctPct: Math.round((correctRounds / totalRounds) * 100),
        roundsCompleted: metrics.totalRounds,
        avgResponseMs: metrics.avgResponseMs,
        totalErrors: metrics.totalIncorrectGuesses,
        correctRounds,
        totalRounds
      }
    }
    case 'strike': {
      const shots =
        (metrics.shots as Array<{
          deviationPx: number
          targetWindowPx: number
        }>) ?? []
      const hits = shots.filter((s) => s.deviationPx < s.targetWindowPx).length
      return {
        perfectHits: shots.filter((s) => s.deviationPx < 5).length,
        excellentHits: shots.filter(
          (s) => s.deviationPx >= 5 && s.deviationPx < 15
        ).length,
        accuracyPct:
          shots.length > 0 ? Math.round((hits / shots.length) * 100) : 0,
        avgDeviation:
          shots.length > 0
            ? Math.round(
                shots.reduce((s, r) => s + r.deviationPx, 0) / shots.length
              )
            : 0,
        totalShots: shots.length,
        shots
      }
    }
    case 'depths': {
      const depositsFound = (metrics.depositsFound as number) ?? 0
      const totalDeposits = (metrics.totalDeposits as number) ?? 0
      const chargesUsed = (metrics.chargesUsed as number) ?? 0
      const chargeLimit = (metrics.chargeLimit as number) ?? 0
      const grid =
        (seedFamilyData?.grid as Array<
          Array<{
            row: number
            col: number
            isDeposit: boolean
            isClue: boolean
            isRevealed: boolean
          }>
        >) ?? []
      const preRevealed = grid
        .flat()
        .filter((c) => c.isDeposit && c.isRevealed && !c.isClue).length
      const wastedCharges = chargesUsed - (depositsFound - preRevealed)
      const maxWaste = chargeLimit - totalDeposits + preRevealed
      const foundPositions: { row: number; col: number }[] = []
      for (const row of grid) {
        for (const cell of row) {
          if (cell.isDeposit) {
            foundPositions.push({ row: cell.row, col: cell.col })
          }
        }
      }
      return {
        depositsFound,
        chargesUsed,
        efficiencyPct:
          maxWaste > 0
            ? Math.round(Math.max(0, (1 - wastedCharges / maxWaste) * 100))
            : depositsFound === totalDeposits
              ? 100
              : 0,
        completionTimeMs: metrics.totalElapsedMs,
        gridSize: (seedFamilyData?.gridSize as number) ?? 5,
        foundPositions
      }
    }
  }
}
