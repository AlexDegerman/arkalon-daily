import 'server-only'

import type { ClueTypeId } from '@/types/puzzle'
import type { DepositPatternId } from '@/lib/puzzles/compositionSystem'

export interface DepthsBaseConfig {
  gridSize: number
  depositCount: number
  clueType: ClueTypeId
  depositPattern: DepositPatternId
  startTileRevealed: boolean
}

export const DEPTHS_BASE_CONFIGS: DepthsBaseConfig[] = [
  {
    gridSize: 5,
    depositCount: 3,
    clueType: 'numeric',
    depositPattern: 'scattered',
    startTileRevealed: true
  },
  {
    gridSize: 5,
    depositCount: 3,
    clueType: 'directional',
    depositPattern: 'scattered',
    startTileRevealed: true
  },
  {
    gridSize: 5,
    depositCount: 3,
    clueType: 'numeric',
    depositPattern: 'clustered',
    startTileRevealed: false
  },
  {
    gridSize: 5,
    depositCount: 4,
    clueType: 'numeric',
    depositPattern: 'edges_only',
    startTileRevealed: true
  },
  {
    gridSize: 5,
    depositCount: 4,
    clueType: 'adjacency_count',
    depositPattern: 'diagonal_line',
    startTileRevealed: true
  },
  {
    gridSize: 6,
    depositCount: 3,
    clueType: 'hot_cold',
    depositPattern: 'scattered',
    startTileRevealed: true
  },
  {
    gridSize: 6,
    depositCount: 4,
    clueType: 'numeric',
    depositPattern: 'l_shape',
    startTileRevealed: false
  },
  {
    gridSize: 6,
    depositCount: 4,
    clueType: 'directional',
    depositPattern: 'split',
    startTileRevealed: true
  },
  {
    gridSize: 6,
    depositCount: 5,
    clueType: 'numeric',
    depositPattern: 'center_mass',
    startTileRevealed: false
  },
  {
    gridSize: 6,
    depositCount: 5,
    clueType: 'adjacency_count',
    depositPattern: 'corners',
    startTileRevealed: true
  },
  {
    gridSize: 7,
    depositCount: 4,
    clueType: 'hot_cold',
    depositPattern: 'scattered',
    startTileRevealed: true
  },
  {
    gridSize: 7,
    depositCount: 5,
    clueType: 'numeric',
    depositPattern: 'split',
    startTileRevealed: false
  },
  {
    gridSize: 7,
    depositCount: 5,
    clueType: 'directional',
    depositPattern: 'l_shape',
    startTileRevealed: true
  },
  {
    gridSize: 7,
    depositCount: 6,
    clueType: 'numeric',
    depositPattern: 'edges_only',
    startTileRevealed: false
  },
  {
    gridSize: 7,
    depositCount: 6,
    clueType: 'adjacency_count',
    depositPattern: 'scattered',
    startTileRevealed: false
  }
]
