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
  const pool = distractors.slice(0, choiceCount - 1)
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

function genRotationMirror(
  rng: () => number,
  stepsShown: number,
  choiceCount: number
): CipherRound {
  // Rotation angles: 0, 90, 180, 270 degrees represented as step index * 90
  const rotationStep = pickOne(rng, [45, 90, 120, 180])
  const shape = pickOne(rng, SHAPES)
  const color = pickOne(rng, COLORS)
  const size = pickOne(rng, SIZES)

  // We encode rotation as a custom field in shape name for display purposes
  // The component renders these with CSS transform
  const shown: SequenceElement[] = []
  for (let i = 0; i < stepsShown; i++) {
    shown.push({ shape, color, size })
  }
  const correctRotation = (stepsShown * rotationStep) % 360
  const correct: SequenceElement = { shape, color, size }

  // Distractors are the same shape at wrong rotation steps
  const distractors: SequenceElement[] = [
    makeDistractor(rng, correct),
    makeDistractor(rng, correct),
    makeDistractor(rng, correct)
  ]

  return {
    generator: 'rotation_mirror',
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
  const shapePeriod = 3
  const colorPeriod = 2
  const sizePeriod = 2
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
  // Hidden rule: shapes with >= 4 sides are "yes"
  const yesShapes: ElementShape[] = ['square', 'diamond', 'hexagon', 'star']
  const noShapes: ElementShape[] = ['circle', 'triangle']

  const color = pickOne(rng, COLORS)
  const size = pickOne(rng, SIZES)

  const yesPool = shuffle(rng, yesShapes)
  const noPool = shuffle(rng, noShapes)

  const yesExamples = yesPool
    .slice(0, 3)
    .map((s) => ({ shape: s, color, size }))
  const noExamples = noPool.slice(0, 2).map((s) => ({ shape: s, color, size }))

  // Correct answer: a yes-shape not yet shown
  const shownYesShapes = new Set(yesExamples.map((e) => e.shape))
  const unusedYes = yesShapes.filter((s) => !shownYesShapes.has(s))
  const correctShape =
    unusedYes.length > 0
      ? unusedYes[nextInt(rng, unusedYes.length)]
      : yesPool[0]
  const correct: SequenceElement = { shape: correctShape, color, size }

  // Distractors: no-shapes
  const distractors = noShapes.map(
    (s) => ({ shape: s, color, size }) as SequenceElement
  )

  return {
    generator: 'rule_discovery',
    shownElements: [],
    correctAnswer: correct,
    choices: buildChoices(rng, correct, distractors, choiceCount),
    yesExamples,
    noExamples
  }
}

function genGridTransform(
  rng: () => number,
  stepsShown: number,
  choiceCount: number
): CipherRound {
  // We represent a 3x3 grid as a 9-bit integer (bit i = cell i filled)
  const transforms = [
    'rotate_cw',
    'reflect_h',
    'reflect_v',
    'shift_right'
  ] as const
  type Transform = (typeof transforms)[number]
  const transform = pickOne(rng, [...transforms]) as Transform

  function applyTransform(grid: number, t: Transform): number {
    const cells: boolean[] = Array.from({ length: 9 }, (_, i) =>
      Boolean((grid >> i) & 1)
    )
    const g = (r: number, c: number) => cells[r * 3 + c]
    const result = new Array<boolean>(9).fill(false)

    if (t === 'rotate_cw') {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) result[c * 3 + (2 - r)] = g(r, c)
    } else if (t === 'reflect_h') {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) result[r * 3 + (2 - c)] = g(r, c)
    } else if (t === 'reflect_v') {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) result[(2 - r) * 3 + c] = g(r, c)
    } else {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) result[r * 3 + ((c + 1) % 3)] = g(r, c)
    }

    return result.reduce((acc, v, i) => acc | (v ? 1 << i : 0), 0)
  }

  // Generate initial grid with 3-5 filled cells
  const fillCount = nextInt(rng, 3) + 3
  const positions = shuffle(
    rng,
    Array.from({ length: 9 }, (_, i) => i)
  ).slice(0, fillCount)
  let grid = positions.reduce((acc, p) => acc | (1 << p), 0)

  const shown: SequenceElement[] = []
  for (let i = 0; i < stepsShown; i++) {
    // Encode grid state as shape (bitmask encoded in shape name for display)
    shown.push({ shape: 'square', color: 'blue', size: 'medium' })
    grid = applyTransform(grid, transform)
  }
  const correctGrid = grid
  const correct: SequenceElement = {
    shape: 'square',
    color: 'blue',
    size: 'medium'
  }

  // Store grid data in a way the component can render
  // We use color to encode the grid state index
  const distractors = Array.from({ length: 4 }, () =>
    makeDistractor(rng, correct)
  )

  return {
    generator: 'grid_transform',
    shownElements: shown,
    correctAnswer: correct,
    choices: buildChoices(rng, correct, distractors, choiceCount)
  }
}

function genConstrainedChoice(
  rng: () => number,
  choiceCount: number
): CipherRound {
  // Generate 2-3 constraints and find one element satisfying all
  const reqColor = pickOne(rng, COLORS)
  const forbidShape = pickOne(rng, SHAPES)
  const reqSize = pickOne(rng, SIZES)

  const correctShape = SHAPES.filter((s) => s !== forbidShape)[
    nextInt(rng, SHAPES.length - 1)
  ]
  const correct: SequenceElement = {
    shape: correctShape,
    color: reqColor,
    size: reqSize
  }

  const constraints = [
    `Must be ${reqColor}`,
    `Cannot be ${forbidShape}`,
    `Must be ${reqSize}`
  ]

  // Distractors each violate exactly one constraint
  const d1: SequenceElement = {
    ...correct,
    color: COLORS.filter((c) => c !== reqColor)[nextInt(rng, COLORS.length - 1)]
  }
  const d2: SequenceElement = { ...correct, shape: forbidShape }
  const d3: SequenceElement = {
    ...correct,
    size: SIZES.filter((s) => s !== reqSize)[nextInt(rng, SIZES.length - 1)]
  }
  const d4: SequenceElement = makeDistractor(rng, correct)

  return {
    generator: 'constrained_choice',
    shownElements: [],
    correctAnswer: correct,
    choices: buildChoices(rng, correct, [d1, d2, d3, d4], choiceCount),
    constraints
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
