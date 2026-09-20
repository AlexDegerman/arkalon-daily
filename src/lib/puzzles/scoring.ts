import 'server-only'

// All scoring formulas are server-side only.
// Scores are recomputed from raw family_specific_metrics; no client score is trusted.

// ---- Recall (Arkalon Vision) ----

export interface RecallRoundMetrics {
  correctGlyphs: number
  sequenceLength: number
  elapsedMs: number
}

function recallSpeedMultiplier(
  elapsedMs: number,
  sequenceLength: number
): number {
  const idealMs = sequenceLength * 800
  const maxMs = sequenceLength * 3000
  return Math.max(0.5, 1.0 - ((elapsedMs - idealMs) / (maxMs - idealMs)) * 0.5)
}

const RECALL_ROUND_WEIGHTS = [35, 30, 35] as const

export function scoreRecall(rounds: RecallRoundMetrics[]): number {
  let total = 0
  for (let i = 0; i < rounds.length && i < 3; i++) {
    const r = rounds[i]
    const weight = RECALL_ROUND_WEIGHTS[i] ?? 30
    const accuracy = r.correctGlyphs / r.sequenceLength
    const speed = recallSpeedMultiplier(r.elapsedMs, r.sequenceLength)
    total += accuracy * weight * speed
  }
  return Math.min(100, Math.max(0, Math.round(total)))
}

// ---- Surge (Surge Frenzy) ----

export interface SurgeNodeMetrics {
  reactionMs: number // 0 = miss (expired)
  isDecoy: boolean
  consecutiveHitsAtFire: number
}

function surgeReactionGrade(reactionMs: number): number {
  if (reactionMs === 0) return 0.0 // miss
  if (reactionMs < 150) return 1.0
  if (reactionMs < 250) return 0.85
  if (reactionMs < 400) return 0.65
  if (reactionMs < 600) return 0.4
  return 0.0
}

function surgeComboMultiplier(consecutiveHits: number): number {
  return 1.0 + Math.min(consecutiveHits * 0.05, 0.5)
}

export function scoreSurge(
  nodes: SurgeNodeMetrics[],
  expectedNodeCount: number
): number {
  if (expectedNodeCount === 0) return 0
  const baseNodeValue = 100 / expectedNodeCount
  let total = 0

  for (const node of nodes) {
    if (node.isDecoy && node.reactionMs > 0) {
      // Decoy hit penalty
      total -= 2.0
      continue
    }
    const grade = surgeReactionGrade(node.reactionMs)
    const combo = surgeComboMultiplier(node.consecutiveHitsAtFire)
    total += baseNodeValue * grade * combo
  }

  return Math.min(100, Math.max(0, Math.round(total)))
}

// ---- Strike (Sniper Challenge) ----

export interface StrikeShotMetrics {
  deviationPx: number
  targetWindowPx: number
}

function strikeShotGrade(deviationPx: number, targetWindowPx: number): number {
  if (deviationPx < 5) return 1.0
  if (deviationPx < 15) return 0.8
  if (deviationPx < targetWindowPx * 0.5) return 0.55
  if (deviationPx < targetWindowPx) return 0.25
  return 0.0
}

export function scoreStrike(shots: StrikeShotMetrics[]): number {
  if (shots.length === 0) return 0
  const perShotMax = 100 / shots.length
  const total = shots.reduce((sum, shot) => {
    return sum + strikeShotMax(shot) * perShotMax
  }, 0)
  return Math.min(100, Math.max(0, Math.round(total)))
}

function strikeShotMax(shot: StrikeShotMetrics): number {
  return strikeShotGrade(shot.deviationPx, shot.targetWindowPx)
}

// ---- Cipher (Wild Prediction) ----

export interface CipherSessionMetrics {
  correctRounds: number
  totalRounds: number
  totalIncorrectGuesses: number
}

export function scoreCipher(metrics: CipherSessionMetrics): number {
  const accuracyBase = (metrics.correctRounds / metrics.totalRounds) * 80
  const maxAllowedErrors = metrics.totalRounds
  const efficiencyBonus =
    20 * Math.max(0, 1.0 - metrics.totalIncorrectGuesses / maxAllowedErrors)
  return Math.min(100, Math.max(0, Math.round(accuracyBase + efficiencyBonus)))
}

// ---- Depths (Crystal Mine) ----

export interface DepthsSessionMetrics {
  depositsFound: number
  totalDeposits: number
  chargesUsed: number
  chargeLimit: number
}

export function scoreDepths(metrics: DepthsSessionMetrics): number {
  const discoveryBase = (metrics.depositsFound / metrics.totalDeposits) * 80
  const wastedCharges = metrics.chargesUsed - metrics.depositsFound
  const maxWaste = metrics.chargeLimit - metrics.totalDeposits
  const efficiencyBonus =
    maxWaste > 0 ? 20 * Math.max(0, 1.0 - wastedCharges / maxWaste) : 0
  return Math.min(100, Math.max(0, Math.round(discoveryBase + efficiencyBonus)))
}

// ---- Minimum score threshold for streak preservation ----
export const STREAK_MIN_SCORE = 15

export function isSolved(score: number): boolean {
  return score >= STREAK_MIN_SCORE
}
