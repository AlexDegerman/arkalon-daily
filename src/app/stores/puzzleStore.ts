'use client'

import { create } from 'zustand'
import type {
  PuzzleCategory,
  PuzzleSeedData,
  DailyPuzzleInfo
} from '@/types/puzzle'

export type PuzzlePhase =
  | 'idle'
  | 'trial-explainer'
  | 'trial-active'
  | 'trial-complete'
  | 'pre-game'
  | 'active'
  | 'paused'
  | 'complete'

export interface FinalResult {
  score: number
  status: 'solved' | 'failed'
  elapsedMs: number
  metricValues: Record<string, unknown>
}

interface PuzzleState {
  category: PuzzleCategory | null
  puzzleInfo: DailyPuzzleInfo | null
  seedData: PuzzleSeedData | null
  phase: PuzzlePhase
  roundIndex: number
  elapsedMs: number
  pausedAt: number | null
  inputHistory: unknown[]
  finalResult: FinalResult | null

  // Actions
  initCategory: (
    category: PuzzleCategory,
    puzzleInfo: DailyPuzzleInfo,
    seedData: PuzzleSeedData
  ) => void
  setPhase: (phase: PuzzlePhase) => void
  advanceRound: () => void
  recordInput: (input: unknown) => void
  tickElapsed: (ms: number) => void
  setPaused: (paused: boolean) => void
  setFinalResult: (result: FinalResult) => void
  reset: () => void
}

const INITIAL_STATE = {
  category: null,
  puzzleInfo: null,
  seedData: null,
  phase: 'idle' as PuzzlePhase,
  roundIndex: 0,
  elapsedMs: 0,
  pausedAt: null,
  inputHistory: [],
  finalResult: null
}

export const usePuzzleStore = create<PuzzleState>()((set) => ({
  ...INITIAL_STATE,

  initCategory: (category, puzzleInfo, seedData) =>
    set({
      ...INITIAL_STATE,
      category,
      puzzleInfo,
      seedData,
      phase: 'pre-game'
    }),

  setPhase: (phase) => set({ phase }),

  advanceRound: () => set((state) => ({ roundIndex: state.roundIndex + 1 })),

  recordInput: (input) =>
    set((state) => ({ inputHistory: [...state.inputHistory, input] })),

  tickElapsed: (ms) =>
    set((state) => ({
      elapsedMs:
        state.phase === 'paused' ? state.elapsedMs : state.elapsedMs + ms
    })),

  setPaused: (paused) =>
    set((state) => ({
      phase: paused ? 'paused' : 'active',
      pausedAt: paused ? Date.now() : null
    })),

  setFinalResult: (result) => set({ finalResult: result, phase: 'complete' }),

  reset: () => set(INITIAL_STATE)
}))
