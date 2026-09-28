import { describe, it, expect } from 'vitest'
import { WildPredictionFamily } from '@/lib/puzzles/families/wildPrediction'
import type { WildPredictionData } from '@/lib/puzzles/families/wildPrediction'
import { validateChallenge } from '@/lib/puzzles/validateChallenge'
import type {
  CipherRound,
  SequenceElement
} from '@/lib/puzzles/patternGenerators'
import type { PatternGeneratorId, PuzzleSeedData } from '@/types/puzzle'

const SEED = 'c3d4e5f60718293a'

describe('WildPredictionFamily definition', () => {
  it('registers under cipher with the logic-first scoring model', () => {
    expect(WildPredictionFamily.id).toBe('wild_prediction')
    expect(WildPredictionFamily.category).toBe('cipher')
    expect(WildPredictionFamily.scoringModel).toBe('logic-first')
  })
})

describe('generate', () => {
  it('cycles generators in order across the configured round count', () => {
    for (let i = 0; i < 15; i++) {
      const seed = (i * 104729 + 17).toString(16).padStart(8, '0')
      const data = WildPredictionFamily.generate(seed)
      const fam = data.familyData as unknown as WildPredictionData
      const generators = data.profile.patternGenerators!
      expect(fam.rounds).toHaveLength(data.profile.roundCount!)
      fam.rounds.forEach((round, idx) => {
        expect(round.generator).toBe(generators[idx % generators.length])
      })
    }
  })

  it('builds choice counts to match the requested choiceCount', () => {
    for (let i = 0; i < 15; i++) {
      const seed = (i * 15485863 + 19).toString(16).padStart(8, '0')
      const data = WildPredictionFamily.generate(seed)
      const fam = data.familyData as unknown as WildPredictionData
      const choiceCount = data.profile.choiceCount!
      for (const round of fam.rounds) {
        expect(round.choices).toHaveLength(choiceCount)
      }
    }
  })

  it('always places the correct answer inside the choices', () => {
    for (let i = 0; i < 15; i++) {
      const seed = (i * 7919 + 23).toString(16).padStart(8, '0')
      const fam = WildPredictionFamily.generate(seed)
        .familyData as unknown as WildPredictionData
      for (const round of fam.rounds) {
        const found = round.choices.some(
          (c) =>
            c.shape === round.correctAnswer.shape &&
            c.color === round.correctAnswer.color &&
            c.size === round.correctAnswer.size
        )
        expect(found).toBe(true)
      }
    }
  })

  it('is deterministic for the same seed and diverges across seeds', () => {
    const a = WildPredictionFamily.generate(SEED)
    const b = WildPredictionFamily.generate(SEED)
    expect(a).toEqual(b)
    expect(a).not.toEqual(WildPredictionFamily.generate('00000002'))
  })
})

describe('validator', () => {
  function makeRound(generator: PatternGeneratorId): CipherRound {
    const answer: SequenceElement = {
      shape: 'circle',
      color: 'red',
      size: 'medium'
    }
    const other: SequenceElement = {
      shape: 'square',
      color: 'blue',
      size: 'large'
    }
    return {
      generator,
      shownElements: [],
      correctAnswer: answer,
      choices: [answer, other]
    }
  }

  function makeCipherData(rounds: CipherRound[]): PuzzleSeedData {
    return {
      profile: {},
      familyData: {
        rounds,
        timerSeconds: null,
        roundCount: rounds.length
      } as unknown as Record<string, unknown>
    }
  }

  it('accepts a varied three-round session', () => {
    const data = makeCipherData([
      makeRound('alternating'),
      makeRound('dual_variable'),
      makeRound('tri_variable')
    ])
    expect(validateChallenge('wild_prediction', data).valid).toBe(true)
  })

  it('rejects sessions with fewer than three rounds', () => {
    const data = makeCipherData([
      makeRound('alternating'),
      makeRound('alternating')
    ])
    const result = validateChallenge('wild_prediction', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Too few rounds')
  })

  it('rejects long alternating-only sessions but tolerates four rounds', () => {
    const four = makeCipherData(
      Array.from({ length: 4 }, () => makeRound('alternating'))
    )
    const five = makeCipherData(
      Array.from({ length: 5 }, () => makeRound('alternating'))
    )
    expect(validateChallenge('wild_prediction', four).valid).toBe(true)
    const result = validateChallenge('wild_prediction', five)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('alternating-only')
  })

  it('rejects rounds whose correct answer is missing from the choices', () => {
    const broken = makeRound('alternating')
    // Provide 2 choices, neither of which is the correct answer
    broken.choices = [
      { shape: 'square', color: 'blue', size: 'large' },
      { shape: 'triangle', color: 'green', size: 'small' }
    ]
    const data = makeCipherData([
      broken,
      makeRound('dual_variable'),
      makeRound('tri_variable')
    ])
    const result = validateChallenge('wild_prediction', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('missing from choices')
  })

  it('rejects rounds with fewer than two choices', () => {
    const broken = makeRound('alternating')
    broken.choices = [broken.choices[0]]
    const data = makeCipherData([
      broken,
      makeRound('dual_variable'),
      makeRound('tri_variable')
    ])
    const result = validateChallenge('wild_prediction', data)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('fewer than 2 choices')
  })
})
