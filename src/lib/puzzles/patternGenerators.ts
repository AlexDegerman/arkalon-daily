import 'server-only'

import {
  nextInt,
  pickOne,
  shuffle
} from '@/lib/puzzles/seededRandom'
import type { PatternGeneratorId } from '@/types/puzzle'

// Element types for Cipher sequences
export type ElementShape =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'hexagon'
  | 'star'
export type ElementColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange'
export type ElementSize = 'small' | 'medium' | 'large'

export interface SequenceElement {
  shape: ElementShape
  color: ElementColor
  size: ElementSize
}

export interface CipherRound {
  generator: PatternGeneratorId
  // For sequence-based generators: elements shown to the player
  shownElements: SequenceElement[]
  // The correct answer
  correctAnswer: SequenceElement
  // All choices (includes correctAnswer at a random position)
  choices: SequenceElement[]
  // For constrained_choice: the constraint strings shown to the player
  constraints?: string[]
  // For rule_discovery: yes/no example sets
  yesExamples?: SequenceElement[]
  noExamples?: SequenceElement[]
}

const SHAPES: ElementShape[] = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'hexagon',
  'star'
]
const COLORS: ElementColor[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange'
]
const SIZES: ElementSize[] = ['small', 'medium', 'large']

// Inserts the correct answer into the choices array at a random position
function buildChoices(
  rng: () => number,
  correct: SequenceElement,
  distractors: SequenceElement[],
  choiceCount: number
): SequenceElement[] {
  const seen = new Set([`${correct.shape}-${correct.color}-${correct.size}`])
  const pool: SequenceElement[] = []
  for (const d of distractors) {
    if (pool.length >= choiceCount - 1) break
    const key = `${d.shape}-${d.color}-${d.size}`
    if (seen.has(key)) continue
    seen.add(key)
    pool.push(d)
  }
  // Top up deterministically from the full element space when distractors collided
  for (const s of SHAPES) {
    for (const c of COLORS) {
      for (const sz of SIZES) {
        if (pool.length >= choiceCount - 1) break
        const key = `${s}-${c}-${sz}`
        if (seen.has(key)) continue
        seen.add(key)
        pool.push({ shape: s, color: c, size: sz })
      }
    }
  }
  const all = [...pool, correct]
  return shuffle(rng, all)
}

// Generates a distractor by changing exactly one attribute of the correct answer
function makeDistractor(
  rng: () => number,
  correct: SequenceElement
): SequenceElement {
  const axis = nextInt(rng, 3)
  const distractor = { ...correct }
  if (axis === 0) {
    const others = SHAPES.filter((s) => s !== correct.shape)
    distractor.shape = others[nextInt(rng, others.length)]
  } else if (axis === 1) {
    const others = COLORS.filter((c) => c !== correct.color)
    distractor.color = others[nextInt(rng, others.length)]
  } else {
    const others = SIZES.filter((s) => s !== correct.size)
    distractor.size = others[nextInt(rng, others.length)]
  }
  return distractor
}

// --- Generator implementations ---

function genAlternating(
  rng: () => number,
  stepsShown: number,
  choiceCount: number
): CipherRound {
  const shapeA = SHAPES[nextInt(rng, SHAPES.length)]
  const shapeB = SHAPES.filter((s) => s !== shapeA)[
    nextInt(rng, SHAPES.length - 1)
  ]
  const color = COLORS[nextInt(rng, COLORS.length)]
  const size = SIZES[nextInt(rng, SIZES.length)]

  const shown: SequenceElement[] = []
  for (let i = 0; i < stepsShown; i++) {
    shown.push({ shape: i % 2 === 0 ? shapeA : shapeB, color, size })
  }
  const correct: SequenceElement = {
    shape: stepsShown % 2 === 0 ? shapeA : shapeB,
    color,
    size
  }
  const distractors = [
    { ...correct, shape: shapeB },
    makeDistractor(rng, correct),
    makeDistractor(rng, correct),
    makeDistractor(rng, correct),
    makeDistractor(rng, correct)
  ]
  return {
    generator: 'alternating',
    shownElements: shown,
    correctAnswer: correct,
    choices: buildChoices(rng, correct, distractors, choiceCount)
  }
}

function genDualVariable(
  rng: () => number,
  stepsShown: number,
  choiceCount: number
): CipherRound {
  const shapePeriod = 3
  const colorPeriod = 2
  const shapes = shuffle(rng, [...SHAPES]).slice(0, shapePeriod)
  const colors = shuffle(rng, [...COLORS]).slice(0, colorPeriod)
  const size = pickOne(rng, SIZES)

  const shown: SequenceElement[] = []
  for (let i = 0; i < stepsShown; i++) {
    shown.push({
      shape: shapes[i % shapePeriod],
      color: colors[i % colorPeriod],
      size
    })
  }
  const correct: SequenceElement = {
    shape: shapes[stepsShown % shapePeriod],
    color: colors[stepsShown % colorPeriod],
    size
  }
  const distractors = Array.from({ length: 5 }, () =>
    makeDistractor(rng, correct)
  )
  return {
    generator: 'dual_variable',
    shownElements: shown,
    correctAnswer: correct,
    choices: buildChoices(rng, correct, distractors, choiceCount)
  }
}

function genTriVariable(
  rng: () => number,
  stepsShown: number,
  choiceCount: number
): CipherRound {
  // Variable periods force the player to deduce the cycle length itself,
  // not just the pattern. Max periods bounded by available attribute counts
  const shapePeriod = 3 + nextInt(rng, 3) // 3, 4, or 5
  const colorPeriod = 2 + nextInt(rng, 2) // 2 or 3
  const sizePeriod = 2 + nextInt(rng, 2) // 2 or 3
  const shapes = shuffle(rng, [...SHAPES]).slice(0, shapePeriod)
  const colors = shuffle(rng, [...COLORS]).slice(0, colorPeriod)
  const sizes = shuffle(rng, [...SIZES]).slice(0, sizePeriod)

  const shown: SequenceElement[] = []
  for (let i = 0; i < stepsShown; i++) {
    shown.push({
      shape: shapes[i % shapePeriod],
      color: colors[i % colorPeriod],
      size: sizes[i % sizePeriod]
    })
  }
  const correct: SequenceElement = {
    shape: shapes[stepsShown % shapePeriod],
    color: colors[stepsShown % colorPeriod],
    size: sizes[stepsShown % sizePeriod]
  }
  const distractors = Array.from({ length: 6 }, () =>
    makeDistractor(rng, correct)
  )
  return {
    generator: 'tri_variable',
    shownElements: shown,
    correctAnswer: correct,
    choices: buildChoices(rng, correct, distractors, choiceCount)
  }
}

function genRuleDiscovery(rng: () => number, choiceCount: number): CipherRound {
  type RuleType =
    | 'specific_color'
    | 'specific_shape'
    | 'specific_size'
    | 'color_family'
  const ruleTypes: RuleType[] = [
    'specific_color',
    'specific_shape',
    'specific_size',
    'color_family'
  ]
  const rule = pickOne(rng, ruleTypes)

  let predicate: (el: SequenceElement) => boolean

  const targetColor = pickOne(rng, COLORS)
  const targetShape = pickOne(rng, SHAPES)
  const targetSize = pickOne(rng, SIZES)
  const warmColors: ElementColor[] = ['red', 'orange', 'yellow']
  const coolColors: ElementColor[] = ['blue', 'green', 'purple']
  const targetFamily = pickOne(rng, ['warm', 'cool'] as const)

  switch (rule) {
    case 'specific_color':
      predicate = (el) => el.color === targetColor
      break
    case 'specific_shape':
      predicate = (el) => el.shape === targetShape
      break
    case 'specific_size':
      predicate = (el) => el.size === targetSize
      break
    case 'color_family':
      predicate = (el) =>
        targetFamily === 'warm'
          ? warmColors.includes(el.color)
          : coolColors.includes(el.color)
      break
  }

  // Generate a broad universe of all possible distinct elements
  const allPossible: SequenceElement[] = []
  for (const s of SHAPES) {
    for (const c of COLORS) {
      for (const sz of SIZES) {
        allPossible.push({ shape: s, color: c, size: sz })
      }
    }
  }

  const shuffledAll = shuffle(rng, allPossible)
  const validPool = shuffledAll.filter(predicate)
  const invalidPool = shuffledAll.filter((el) => !predicate(el))

  // Pick 3 diverse positive examples and 2 negative examples
  const yesExamples = validPool.slice(0, 3)
  const noExamples = invalidPool.slice(0, 2)

  // Correct answer: a valid element that was NOT already shown in YES
  const usedKeys = new Set(
    [...yesExamples, ...noExamples].map(
      (e) => `${e.shape}-${e.color}-${e.size}`
    )
  )
  const availableCorrect = validPool.filter(
    (e) => !usedKeys.has(`${e.shape}-${e.color}-${e.size}`)
  )
  const correct = availableCorrect[0] ?? validPool[0]

  // Distractors: INVALID elements that were NOT shown in the NO box
  const availableDistractors = invalidPool.filter(
    (e) => !usedKeys.has(`${e.shape}-${e.color}-${e.size}`)
  )
  const chosenDistractors: SequenceElement[] = []

  // Ensure distractors have diverse shapes and colors so player can't just match NO items
  for (const d of availableDistractors) {
    if (chosenDistractors.length >= choiceCount - 1) break
    chosenDistractors.push(d)
  }

  return {
    generator: 'rule_discovery',
    shownElements: [],
    correctAnswer: correct,
    choices: buildChoices(rng, correct, chosenDistractors, choiceCount),
    yesExamples,
    noExamples
  }
}

function genConstrainedChoice(
  rng: () => number,
  choiceCount: number
): CipherRound {
  const correct: SequenceElement = {
    shape: pickOne(rng, SHAPES),
    color: pickOne(rng, COLORS),
    size: pickOne(rng, SIZES)
  }
  interface Constraint {
    label: string
    hard: boolean
    holds: (el: SequenceElement) => boolean
  }
  const warm: ElementColor[] = ['red', 'orange', 'yellow']
  const isWarm = (el: SequenceElement) => warm.includes(el.color)
  const traitsShared = (a: SequenceElement, b: SequenceElement) =>
    (a.shape === b.shape ? 1 : 0) +
    (a.color === b.color ? 1 : 0) +
    (a.size === b.size ? 1 : 0)
  const describe = (el: SequenceElement) => `${el.color} ${el.size} ${el.shape}`
  const basic: Constraint[] = [
    {
      label: `Must be ${correct.color}`,
      hard: false,
      holds: (el) => el.color === correct.color
    },
    {
      label: `Must be ${correct.shape}`,
      hard: false,
      holds: (el) => el.shape === correct.shape
    },
    {
      label: `Must be ${correct.size}`,
      hard: false,
      holds: (el) => el.size === correct.size
    }
  ]
  const hard: Constraint[] = []
  for (const c of COLORS) {
    if (c !== correct.color)
      hard.push({
        label: `Cannot be ${c}`,
        hard: true,
        holds: (el) => el.color !== c
      })
  }
  for (const s of SHAPES) {
    if (s !== correct.shape)
      hard.push({
        label: `Cannot be ${s}`,
        hard: true,
        holds: (el) => el.shape !== s
      })
  }
  for (const sz of SIZES) {
    if (sz !== correct.size)
      hard.push({
        label: `Cannot be ${sz}`,
        hard: true,
        holds: (el) => el.size !== sz
      })
  }
  hard.push(
    isWarm(correct)
      ? {
          label: 'Must be warm-toned (red, orange, yellow)',
          hard: true,
          holds: isWarm
        }
      : {
          label: 'Must be cool-toned (blue, green, purple)',
          hard: true,
          holds: (el) => !isWarm(el)
        }
  )
  const xorShape = pickOne(
    rng,
    SHAPES.filter((s) => s !== correct.shape)
  )
  hard.push({
    label: `Must be ${correct.color} or ${xorShape}, but not both`,
    hard: true,
    holds: (el) => (el.color === correct.color) !== (el.shape === xorShape)
  })
  const sharedAxis = nextInt(rng, 3)
  const refOne: SequenceElement = {
    shape:
      sharedAxis === 0
        ? correct.shape
        : pickOne(
            rng,
            SHAPES.filter((s) => s !== correct.shape)
          ),
    color:
      sharedAxis === 1
        ? correct.color
        : pickOne(
            rng,
            COLORS.filter((c) => c !== correct.color)
          ),
    size:
      sharedAxis === 2
        ? correct.size
        : pickOne(
            rng,
            SIZES.filter((s) => s !== correct.size)
          )
  }
  hard.push({
    label: `Shares exactly one trait with the ${describe(refOne)}`,
    hard: true,
    holds: (el) => traitsShared(el, refOne) === 1
  })
  const refNone: SequenceElement = {
    shape: pickOne(
      rng,
      SHAPES.filter((s) => s !== correct.shape)
    ),
    color: pickOne(
      rng,
      COLORS.filter((c) => c !== correct.color)
    ),
    size: pickOne(
      rng,
      SIZES.filter((s) => s !== correct.size)
    )
  }
  hard.push({
    label: `Shares no traits with the ${describe(refNone)}`,
    hard: true,
    holds: (el) => traitsShared(el, refNone) === 0
  })
  const impColor = pickOne(
    rng,
    COLORS.filter((c) => c !== correct.color)
  )
  const impSize = pickOne(rng, SIZES)
  hard.push({
    label: `If it is ${impColor}, it must be ${impSize}`,
    hard: true,
    holds: (el) => el.color !== impColor || el.size === impSize
  })
  // 3-4 constraints weighted toward hard types so elimination demands
  // real deduction instead of three templated attribute checks
  const count = 3 + nextInt(rng, 2)
  const constraints = [
    ...shuffle(rng, hard).slice(0, count - 1),
    ...shuffle(rng, basic).slice(0, 1)
  ]
  // Distractors violate exactly one constraint each (near-misses);
  // scan the 108-element space deterministically for each slot
  const all: SequenceElement[] = []
  for (const s of SHAPES)
    for (const c of COLORS)
      for (const sz of SIZES) all.push({ shape: s, color: c, size: sz })
  const keyOf = (el: SequenceElement) => `${el.shape}-${el.color}-${el.size}`
  const seen = new Set([keyOf(correct)])
  const distractors: SequenceElement[] = []
  const start = nextInt(rng, all.length)
  for (let slot = 0; slot < choiceCount - 1; slot++) {
    const target = constraints[slot % constraints.length]
    for (let step = 0; step < all.length; step++) {
      const el = all[(start + step) % all.length]
      const k = keyOf(el)
      if (seen.has(k)) continue
      if (
        !target.holds(el) &&
        constraints.every((cn) => cn === target || cn.holds(el))
      ) {
        seen.add(k)
        distractors.push(el)
        break
      }
    }
  }
  // Safety top-up: any unseen element violating at least one constraint
  for (
    let step = 0;
    distractors.length < choiceCount - 1 && step < all.length;
    step++
  ) {
    const el = all[(start + step) % all.length]
    const k = keyOf(el)
    if (seen.has(k)) continue
    if (constraints.some((cn) => !cn.holds(el))) {
      seen.add(k)
      distractors.push(el)
    }
  }
  return {
    generator: 'constrained_choice',
    shownElements: [],
    correctAnswer: correct,
    choices: buildChoices(rng, correct, distractors, choiceCount),
    constraints: constraints.map((c) => c.label)
  }
}

// Main entry point: generate one CipherRound for the given generator
export function generateRound(
  rng: () => number,
  generator: PatternGeneratorId,
  stepsShown: number,
  choiceCount: number
): CipherRound {
  switch (generator) {
    case 'alternating':
      return genAlternating(rng, stepsShown, choiceCount)
    case 'dual_variable':
      return genDualVariable(rng, stepsShown, choiceCount)
    case 'tri_variable':
      return genTriVariable(rng, stepsShown, choiceCount)
    case 'rule_discovery':
      return genRuleDiscovery(rng, choiceCount)
    case 'constrained_choice':
      return genConstrainedChoice(rng, choiceCount)
    default:
      return genAlternating(rng, stepsShown, choiceCount)
  }
}
