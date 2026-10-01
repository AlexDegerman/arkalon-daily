import 'server-only'

import type { ClueTypeId } from '@/types/puzzle'
import type { DepositPatternId } from '@/lib/puzzles/compositionSystem'

export interface DepthsBaseConfig {
  gridSize: number
  depositCount: number
  clueType: ClueTypeId
  depositPattern: DepositPatternId
}

export const DEPTHS_BASE_CONFIGS: DepthsBaseConfig[] = [
  {
    gridSize: 5,
    depositCount: 5,
    clueType: 'numeric',
    depositPattern: 'scattered'
  },
  {
    gridSize: 6,
    depositCount: 5,
    clueType: 'numeric',
    depositPattern: 'scattered'
  },
  {
    gridSize: 7,
    depositCount: 6,
    clueType: 'directional',
    depositPattern: 'scattered'
  },
  {
    gridSize: 6,
    depositCount: 5,
    clueType: 'numeric',
    depositPattern: 'center_mass'
  },
  {
    gridSize: 6,
    depositCount: 5,
    clueType: 'adjacency_count',
    depositPattern: 'diagonal_line'
  },
  {
    gridSize: 6,
    depositCount: 5,
    clueType: 'hot_cold',
    depositPattern: 'scattered'
  },
  {
    gridSize: 6,
    depositCount: 5,
    clueType: 'numeric',
    depositPattern: 'l_shape'
  },
  {
    gridSize: 7,
    depositCount: 6,
    clueType: 'directional',
    depositPattern: 'diagonal_line'
  },
  {
    gridSize: 6,
    depositCount: 5,
    clueType: 'numeric',
    depositPattern: 'center_mass'
  },
  {
    gridSize: 6,
    depositCount: 5,
    clueType: 'adjacency_count',
    depositPattern: 'corners'
  },
  {
    gridSize: 7,
    depositCount: 6,
    clueType: 'hot_cold',
    depositPattern: 'scattered'
  },
  {
    gridSize: 7,
    depositCount: 6,
    clueType: 'numeric',
    depositPattern: 'split'
  },
  {
    gridSize: 7,
    depositCount: 6,
    clueType: 'directional',
    depositPattern: 'scattered'
  },
  {
    gridSize: 7,
    depositCount: 6,
    clueType: 'numeric',
    depositPattern: 'edges_only'
  },
  {
    gridSize: 7,
    depositCount: 6,
    clueType: 'adjacency_count',
    depositPattern: 'scattered'
  }
]