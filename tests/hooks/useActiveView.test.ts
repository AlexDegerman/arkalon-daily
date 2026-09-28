import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useActiveView } from '@/hooks/useActiveView'
import { usePathname } from 'next/navigation'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn()
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function withPath(path: string) {
  vi.mocked(usePathname).mockReturnValue(path)
}

describe('useActiveView', () => {
  it('maps the root path to home', () => {
    withPath('/')
    expect(renderHook(() => useActiveView()).result.current).toBe('home')
  })

  it('maps the leaderboard path', () => {
    withPath('/leaderboard')
    expect(renderHook(() => useActiveView()).result.current).toBe('leaderboard')
  })

  it('maps the profile path', () => {
    withPath('/profile')
    expect(renderHook(() => useActiveView()).result.current).toBe('profile')
  })

  it('treats review routes as home', () => {
    withPath('/review/recall')
    expect(renderHook(() => useActiveView()).result.current).toBe('home')
  })

  it('treats category routes as game', () => {
    withPath('/recall')
    expect(renderHook(() => useActiveView()).result.current).toBe('game')
    withPath('/surge')
    expect(renderHook(() => useActiveView()).result.current).toBe('game')
  })
})
