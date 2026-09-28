import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTabGuard } from '@/hooks/useTabGuard'

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = []
  name: string
  onmessage: ((event: { data: unknown }) => void) | null = null
  posted: unknown[] = []
  closed = false
  constructor(name: string) {
    this.name = name
    MockBroadcastChannel.instances.push(this)
  }
  postMessage(message: unknown) {
    this.posted.push(message)
  }
  close() {
    this.closed = true
  }
}

beforeEach(() => {
  MockBroadcastChannel.instances = []
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useTabGuard', () => {
  it('announces the tab on mount', () => {
    renderHook(() => useTabGuard())
    const channel = MockBroadcastChannel.instances[0]
    expect(channel).toBeDefined()
    expect(channel.name).toBe('arkalon_daily_tab')
    expect(channel.posted).toContainEqual({ type: 'tab-open' })
  })

  it('responds to another tab opening', () => {
    renderHook(() => useTabGuard())
    const channel = MockBroadcastChannel.instances[0]
    channel.onmessage?.({ data: { type: 'tab-open' } })
    expect(channel.posted).toContainEqual({ type: 'tab-exists' })
  })

  it('fires the callback when a duplicate tab is detected', () => {
    const onDuplicate = vi.fn()
    renderHook(() => useTabGuard(onDuplicate))
    const channel = MockBroadcastChannel.instances[0]
    channel.onmessage?.({ data: { type: 'tab-exists' } })
    expect(onDuplicate).toHaveBeenCalledTimes(1)
  })

  it('closes the channel on unmount', () => {
    const { unmount } = renderHook(() => useTabGuard())
    const channel = MockBroadcastChannel.instances[0]
    unmount()
    expect(channel.closed).toBe(true)
  })
})
