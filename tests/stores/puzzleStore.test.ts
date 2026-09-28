import { describe, it, expect, beforeEach } from 'vitest'
import { usePuzzleStore } from '@/app/stores/puzzleStore'

beforeEach(() => {
  usePuzzleStore.setState({ pauseSignal: 0 })
})

describe('usePuzzleStore', () => {
  it('starts with a zero pause signal', () => {
    expect(usePuzzleStore.getState().pauseSignal).toBe(0)
  })

  it('increments the pause signal on each request', () => {
    usePuzzleStore.getState().requestPause()
    expect(usePuzzleStore.getState().pauseSignal).toBe(1)
    usePuzzleStore.getState().requestPause()
    usePuzzleStore.getState().requestPause()
    expect(usePuzzleStore.getState().pauseSignal).toBe(3)
  })
})
