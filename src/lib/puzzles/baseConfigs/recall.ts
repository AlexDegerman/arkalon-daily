export interface RecallBaseConfig {
  seqLengths: [number, number, number]
  perGlyphMs: number
  glyphPool: number
  randomizedLayout: boolean
  reverseEntry: boolean
}

export const RECALL_BASE_CONFIGS: RecallBaseConfig[] = [
  {
    seqLengths: [3, 5, 7],
    perGlyphMs: 800,
    glyphPool: 8,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [4, 6, 8],
    perGlyphMs: 750,
    glyphPool: 10,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [3, 5, 7],
    perGlyphMs: 700,
    glyphPool: 8,
    randomizedLayout: true,
    reverseEntry: false
  },
  {
    seqLengths: [5, 7, 9],
    perGlyphMs: 800,
    glyphPool: 12,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [4, 6, 8],
    perGlyphMs: 650,
    glyphPool: 10,
    randomizedLayout: false,
    reverseEntry: true
  },
  {
    seqLengths: [3, 6, 9],
    perGlyphMs: 750,
    glyphPool: 8,
    randomizedLayout: true,
    reverseEntry: false
  },
  {
    seqLengths: [5, 7, 10],
    perGlyphMs: 700,
    glyphPool: 14,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [4, 7, 10],
    perGlyphMs: 650,
    glyphPool: 12,
    randomizedLayout: false,
    reverseEntry: true
  },
  {
    seqLengths: [3, 5, 8],
    perGlyphMs: 600,
    glyphPool: 8,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [6, 8, 11],
    perGlyphMs: 800,
    glyphPool: 16,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [4, 6, 9],
    perGlyphMs: 600,
    glyphPool: 10,
    randomizedLayout: true,
    reverseEntry: false
  },
  {
    seqLengths: [5, 8, 11],
    perGlyphMs: 700,
    glyphPool: 14,
    randomizedLayout: false,
    reverseEntry: true
  },
  {
    seqLengths: [6, 9, 12],
    perGlyphMs: 850,
    glyphPool: 16,
    randomizedLayout: false,
    reverseEntry: false
  },
  {
    seqLengths: [4, 7, 10],
    perGlyphMs: 550,
    glyphPool: 12,
    randomizedLayout: true,
    reverseEntry: true
  },
  {
    seqLengths: [5, 8, 12],
    perGlyphMs: 650,
    glyphPool: 16,
    randomizedLayout: true,
    reverseEntry: false
  }
]
