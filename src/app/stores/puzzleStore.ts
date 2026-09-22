'use client'

import { create } from 'zustand'

// Stores only cross-cutting puzzle signals. Puzzle-specific state stays
// local to components and flows through props and callbacks.
interface PuzzleState {
  pauseSignal: number
  requestPause: () => void
}

export const usePuzzleStore = create<PuzzleState>()((set) => ({
  pauseSignal: 0,
  requestPause: () => set((state) => ({ pauseSignal: state.pauseSignal + 1 }))
}))
