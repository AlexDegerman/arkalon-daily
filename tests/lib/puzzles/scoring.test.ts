import { describe, it, expect } from 'vitest'
import {
  scoreRecall,
  scoreSurge,
  scoreStrike,
  scoreCipher,
  scoreDepths,
  isSolved,
  STREAK_MIN_SCORE
} from '@/lib/puzzles/scoring'

describe('scoreRecall', () => {
  it('returns 100 for three perfect rounds at ideal speed', () => {
    const score = scoreRecall([
      { correctGlyphs: 3, sequenceLength: 3, elapsedMs: 3 * 800 },
      { correctGlyphs: 5, sequenceLength: 5, elapsedMs: 5 * 800 },
      { correctGlyphs: 7, sequenceLength: 7, elapsedMs: 7 * 800 }
    ])
    expect(score).toBe(100)
  })

  it('returns 0 when no glyphs are correct', () => {
    const score = scoreRecall([
      { correctGlyphs: 0, sequenceLength: 3, elapsedMs: 2400 },
      { correctGlyphs: 0, sequenceLength: 5, elapsedMs: 4000 },
      { correctGlyphs: 0, sequenceLength: 7, elapsedMs: 5600 }
    ])
    expect(score).toBe(0)
  })

  it('applies the speed multiplier proportionally', () => {
    // len 3: ideal 4200ms, max 9600ms. 5700ms -> speed = 1.0 - ((5700-4200)/(9600-4200)) * 0.15 = 0.95833...
    // Weight 35 * accuracy 1.0 * 0.95833... = 33.54 -> rounds to 34
    const score = scoreRecall([
      { correctGlyphs: 3, sequenceLength: 3, elapsedMs: 5700 }
    ])
    expect(score).toBe(34)
  })

  it('clamps the speed multiplier at the 0.85 floor', () => {
    // Absurdly slow -> multiplier floors at 0.85. 35 * 1.0 * 0.85 = 29.75 -> 30
    const score = scoreRecall([
      { correctGlyphs: 3, sequenceLength: 3, elapsedMs: 999_999 }
    ])
    expect(score).toBe(30)
  })

  it('only scores the first three rounds', () => {
    const score = scoreRecall([
      { correctGlyphs: 0, sequenceLength: 3, elapsedMs: 2400 },
      { correctGlyphs: 0, sequenceLength: 5, elapsedMs: 4000 },
      { correctGlyphs: 0, sequenceLength: 7, elapsedMs: 5600 },
      { correctGlyphs: 9, sequenceLength: 9, elapsedMs: 7200 }
    ])
    expect(score).toBe(0)
  })

  it('clamps to 0-100', () => {
    const score = scoreRecall([])
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('scoreSurge', () => {
  it('returns 0 when expectedNodeCount is 0', () => {
    expect(scoreSurge([], 0)).toBe(0)
  })

  it('returns 100 when every node is hit instantly with no combo', () => {
    const nodes = Array.from({ length: 4 }, () => ({
      reactionMs: 100,
      isDecoy: false,
      consecutiveHitsAtFire: 0
    }))
    expect(scoreSurge(nodes, 4)).toBe(100)
  })

  it('scores reaction grades correctly', () => {
    // Single node, expected 1 -> base value 100
    const run = (reactionMs: number) =>
      scoreSurge([{ reactionMs, isDecoy: false, consecutiveHitsAtFire: 0 }], 1)
    expect(run(100)).toBe(100) // <300  -> 1.0
    expect(run(200)).toBe(100) // <300  -> 1.0
    expect(run(300)).toBe(85) // <450  -> 0.85
    expect(run(500)).toBe(70) // <650  -> 0.7
    expect(run(700)).toBe(45) // <900  -> 0.45
    expect(run(1000)).toBe(25) // <1400 -> 0.25
    expect(run(1500)).toBe(0) // >=1400 -> 0.0
  })

  it('treats expired nodes (reactionMs 0) as misses worth zero', () => {
    const nodes = [
      { reactionMs: 100, isDecoy: false, consecutiveHitsAtFire: 0 },
      { reactionMs: 0, isDecoy: false, consecutiveHitsAtFire: 0 }
    ]
    expect(scoreSurge(nodes, 2)).toBe(50)
  })

  it('applies the combo multiplier and caps it at 1.5', () => {
    // 20 consecutive hits -> 1 + min(20*0.05, 0.5) = 1.5
    // 100 * 1.0 * 1.5 = 150 -> clamped to 100
    const score = scoreSurge(
      [{ reactionMs: 100, isDecoy: false, consecutiveHitsAtFire: 20 }],
      1
    )
    expect(score).toBe(100)
  })

  it('subtracts 2 points per decoy hit', () => {
    const nodes = [
      ...Array.from({ length: 4 }, () => ({
        reactionMs: 100,
        isDecoy: false,
        consecutiveHitsAtFire: 0
      })),
      { reactionMs: 100, isDecoy: true, consecutiveHitsAtFire: 0 }
    ]
    expect(scoreSurge(nodes, 4)).toBe(98)
  })

  it('does not penalize ignored decoys', () => {
    const nodes = [
      { reactionMs: 100, isDecoy: false, consecutiveHitsAtFire: 0 },
      { reactionMs: 0, isDecoy: true, consecutiveHitsAtFire: 0 }
    ]
    expect(scoreSurge(nodes, 1)).toBe(100)
  })
})

describe('scoreStrike', () => {
  it('returns 0 for an empty shot list', () => {
    expect(scoreStrike([])).toBe(0)
  })

  it('returns 100 when every shot is perfect', () => {
    const shots = Array.from({ length: 4 }, () => ({
      deviationPx: 0,
      targetWindowPx: 80
    }))
    expect(scoreStrike(shots)).toBe(100)
  })

  it('applies grade thresholds per shot', () => {
    const run = (deviationPx: number) =>
      scoreStrike([{ deviationPx, targetWindowPx: 80 }])
    expect(run(4)).toBe(100) // <5          -> 1.0
    expect(run(14)).toBe(80) // <15         -> 0.8
    expect(run(39)).toBe(55) // <window*0.5 -> 0.55
    expect(run(79)).toBe(25) // <window     -> 0.25
    expect(run(80)).toBe(0) // miss        -> 0.0
  })
})

describe('scoreCipher', () => {
  it('returns 100 for a flawless session', () => {
    const score = scoreCipher({
      correctRounds: 3,
      totalRounds: 3,
      totalIncorrectGuesses: 0
    })
    expect(score).toBe(100)
  })

  it('returns 0 when every round is wrong and errors exhaust the budget', () => {
    const score = scoreCipher({
      correctRounds: 0,
      totalRounds: 4,
      totalIncorrectGuesses: 4
    })
    expect(score).toBe(0)
  })

  it('floors the efficiency bonus at zero for excessive errors', () => {
    const score = scoreCipher({
      correctRounds: 0,
      totalRounds: 4,
      totalIncorrectGuesses: 10
    })
    expect(score).toBe(0)
  })

  it('awards partial efficiency when some errors are made', () => {
    // 2/4 correct = 40 base, 2 errors / 4 allowed -> 20 * 0.5 = 10
    const score = scoreCipher({
      correctRounds: 2,
      totalRounds: 4,
      totalIncorrectGuesses: 2
    })
    expect(score).toBe(50)
  })
})

describe('scoreDepths', () => {
  it('returns 100 for a perfect excavation', () => {
    const score = scoreDepths({
      depositsFound: 3,
      totalDeposits: 3,
      chargesUsed: 3,
      chargeLimit: 6
    })
    expect(score).toBe(100)
  })

  it('returns 80 when all deposits are found but all spare charges are wasted', () => {
    const score = scoreDepths({
      depositsFound: 3,
      totalDeposits: 3,
      chargesUsed: 6,
      chargeLimit: 6
    })
    expect(score).toBe(80)
  })

  it('returns 0 discovery base with full efficiency when nothing is found or spent', () => {
    const score = scoreDepths({
      depositsFound: 0,
      totalDeposits: 3,
      chargesUsed: 0,
      chargeLimit: 6
    })
    expect(score).toBe(20)
  })

  it('skips the efficiency bonus when there is no waste budget', () => {
    // chargeLimit == totalDeposits -> maxWaste 0 -> bonus branch returns 0
    const score = scoreDepths({
      depositsFound: 3,
      totalDeposits: 3,
      chargesUsed: 3,
      chargeLimit: 3
    })
    expect(score).toBe(80)
  })

  it('scales discovery proportionally', () => {
    // 1/3 found with zero waste -> 26.67 + 20 = 47 (rounded)
    const score = scoreDepths({
      depositsFound: 1,
      totalDeposits: 3,
      chargesUsed: 1,
      chargeLimit: 6
    })
    expect(score).toBe(47)
  })
})

describe('isSolved', () => {
  it('uses STREAK_MIN_SCORE as the threshold', () => {
    expect(STREAK_MIN_SCORE).toBe(15)
    expect(isSolved(15)).toBe(true)
    expect(isSolved(14)).toBe(false)
    expect(isSolved(0)).toBe(false)
    expect(isSolved(100)).toBe(true)
  })
})
