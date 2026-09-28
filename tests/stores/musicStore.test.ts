import { describe, it, expect, beforeEach } from 'vitest'
import { useMusicStore, BGM_TRACKS } from '@/app/stores/musicStore'

const MENU_IDS = BGM_TRACKS.menu.map((t) => t.id)

beforeEach(() => {
  useMusicStore.setState({
    context: 'menu',
    trackId: 'menu-01',
    lastMenuTrackId: 'menu-01',
    isPlaying: false,
    isCrossfading: false
  })
})

describe('useMusicStore', () => {
  it('starts in the menu context with a valid menu track', () => {
    const s = useMusicStore.getState()
    expect(s.context).toBe('menu')
    expect(MENU_IDS).toContain(s.trackId)
  })

  it('ignores setContext for the current context', () => {
    useMusicStore.getState().setContext('menu')
    const s = useMusicStore.getState()
    expect(s.context).toBe('menu')
    expect(s.trackId).toBe('menu-01')
  })

  it('switches to the single puzzle context track', () => {
    useMusicStore.getState().setContext('recall')
    const s = useMusicStore.getState()
    expect(s.context).toBe('recall')
    expect(s.trackId).toBe('recall-01')
  })

  it('avoids repeating the last menu track when returning to menu', () => {
    useMusicStore.getState().setContext('recall')
    useMusicStore.getState().setContext('menu')
    const s = useMusicStore.getState()
    expect(s.context).toBe('menu')
    expect(MENU_IDS).toContain(s.trackId)
    expect(s.trackId).not.toBe('menu-01')
    expect(s.lastMenuTrackId).toBe(s.trackId)
  })

  it('advances to a different menu track without repeating', () => {
    useMusicStore.getState().advanceTrack()
    const s = useMusicStore.getState()
    expect(MENU_IDS).toContain(s.trackId)
    expect(s.trackId).not.toBe('menu-01')
  })

  it('keeps the only track for single-track contexts', () => {
    useMusicStore.getState().setContext('surge')
    useMusicStore.getState().advanceTrack()
    expect(useMusicStore.getState().trackId).toBe('surge-01')
  })

  it('tracks playback and crossfade state', () => {
    useMusicStore.getState().setIsPlaying(true)
    useMusicStore.getState().setIsCrossfading(true)
    const s = useMusicStore.getState()
    expect(s.isPlaying).toBe(true)
    expect(s.isCrossfading).toBe(true)
  })
})
