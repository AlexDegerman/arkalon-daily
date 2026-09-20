import 'server-only'

// 15 hand-crafted Recall base configurations
// Each is a curated axis combination; the generator applies continuous-parameter
// variation on top of these to produce the daily instance.

export interface RecallBaseConfig {
  seqLengths: [number, number, number] // round 1, 2, 3
  displayDurationMs: number
  glyphPool: number
  randomizedLayout: boolean
  reverseEntry: boolean
}

export const RECALL_BASE_CONFIGS: RecallBaseConfig[] = [
  {
    seqLengths: [3, 5, 7],
    displayDurationMs: 3000,
    glyphPool: 8,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [4, 6, 8],
    displayDurationMs: 2500,
    glyphPool: 10,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [3, 5, 7],
    displayDurationMs: 2000,
    glyphPool: 8,
    randomizedLayout: true,
    reverseEntry: false
  },
  {
    seqLengths: [5, 7, 9],
    displayDurationMs: 3000,
    glyphPool: 12,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [4, 6, 8],
    displayDurationMs: 2000,
    glyphPool: 10,
    randomizedLayout: false,
    reverseEntry: true
  },
  {
    seqLengths: [3, 6, 9],
    displayDurationMs: 2500,
    glyphPool: 8,
    randomizedLayout: true,
    reverseEntry: false
  },
  {
    seqLengths: [5, 7, 10],
    displayDurationMs: 2500,
    glyphPool: 14,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [4, 7, 10],
    displayDurationMs: 2000,
    glyphPool: 12,
    randomizedLayout: false,
    reverseEntry: true
  },
  {
    seqLengths: [3, 5, 8],
    displayDurationMs: 1500,
    glyphPool: 8,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [6, 8, 11],
    displayDurationMs: 3000,
    glyphPool: 16,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [4, 6, 9],
    displayDurationMs: 1500,
    glyphPool: 10,
    randomizedLayout: true,
    reverseEntry: false
  },
  {
    seqLengths: [5, 8, 11],
    displayDurationMs: 2500,
    glyphPool: 14,
    randomizedLayout: false,
    reverseEntry: true
  },
  {
    seqLengths: [6, 9, 12],
    displayDurationMs: 3500,
    glyphPool: 16,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [4, 7, 10],
    displayDurationMs: 1500,
    glyphPool: 12,
    randomizedLayout: true,
    reverseEntry: true
  },
  {
    seqLengths: [5, 8, 12],
    displayDurationMs: 2000,
    glyphPool: 16,
    randomizedLayout: true,
    reverseEntry: false
  }
]
