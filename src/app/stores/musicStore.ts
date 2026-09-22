'use client'
import { create } from 'zustand'
export type BGMContext =
  | 'menu'
  | 'recall'
  | 'surge'
  | 'cipher'
  | 'strike'
  | 'depths'
export interface BGMTrack {
  id: string
  src: string
  // Menu tracks play through and rotate; puzzle tracks loop seamlessly
  loop: boolean
}
// One track per puzzle context; the menu rotates through three tracks.
// Every track is a different genre so contexts stay sonically distinct.
export const BGM_TRACKS: Record<BGMContext, BGMTrack[]> = {
  menu: [
    { id: 'menu-01', src: '/music/menu-01-nebula-drift.mp3', loop: false },
    { id: 'menu-02', src: '/music/menu-02-crystal-lofi.mp3', loop: false },
    { id: 'menu-03', src: '/music/menu-03-starport-synthwave.mp3', loop: false }
  ],
  recall: [
    { id: 'recall-01', src: '/music/recall-01-memory-piano.mp3', loop: true }
  ],
  surge: [{ id: 'surge-01', src: '/music/surge-01-storm-dnb.mp3', loop: true }],
  cipher: [
    { id: 'cipher-01', src: '/music/cipher-01-pattern-idm.mp3', loop: true }
  ],
  strike: [
    {
      id: 'strike-01',
      src: '/music/strike-01-crosshair-percussion.mp3',
      loop: true
    }
  ],
  depths: [
    {
      id: 'depths-01',
      src: '/music/depths-01-abyss-dub-techno.mp3',
      loop: true
    }
  ]
}
function pickRandomTrack(context: BGMContext, excludeId?: string): BGMTrack {
  const tracks = BGM_TRACKS[context]
  const pool =
    excludeId && tracks.length > 1
      ? tracks.filter((t) => t.id !== excludeId)
      : tracks
  return pool[Math.floor(Math.random() * pool.length)] ?? tracks[0]
}
const initialMenuTrack = pickRandomTrack('menu')
interface MusicState {
  context: BGMContext
  trackId: string
  lastMenuTrackId: string
  isPlaying: boolean
  isCrossfading: boolean
  setContext: (context: BGMContext) => void
  // Called when a non-looping track ends: rotate to another track of the
  // same context without repeating the one that just finished
  advanceTrack: () => void
  setIsPlaying: (playing: boolean) => void
  setIsCrossfading: (crossfading: boolean) => void
}
export const useMusicStore = create<MusicState>()((set, get) => ({
  context: 'menu',
  trackId: initialMenuTrack.id,
  lastMenuTrackId: initialMenuTrack.id,
  isPlaying: false,
  isCrossfading: false,
  setContext: (context) => {
    // Re-entering the same context keeps the current track alive
    if (context === get().context) return
    const exclude = context === 'menu' ? get().lastMenuTrackId : undefined
    const track = pickRandomTrack(context, exclude)
    set({
      context,
      trackId: track.id,
      ...(context === 'menu' ? { lastMenuTrackId: track.id } : {})
    })
  },
  advanceTrack: () => {
    const { context, trackId } = get()
    const next = pickRandomTrack(context, trackId)
    set(
      context === 'menu'
        ? { trackId: next.id, lastMenuTrackId: next.id }
        : { trackId: next.id }
    )
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsCrossfading: (isCrossfading) => set({ isCrossfading })
}))
