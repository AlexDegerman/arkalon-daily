'use client'

import { create } from 'zustand'

export type BGMContext =
  | 'menu'
  | 'recall'
  | 'surge'
  | 'cipher'
  | 'strike'
  | 'depths'

export const BGM_TRACK_MAP: Record<BGMContext, string> = {
  menu: '/music/menu.mp3',
  recall: '/music/recall.mp3',
  surge: '/music/surge.mp3',
  cipher: '/music/cipher.mp3',
  strike: '/music/strike.mp3',
  depths: '/music/depths.mp3'
}

interface MusicState {
  context: BGMContext
  isPlaying: boolean
  isCrossfading: boolean
  setContext: (context: BGMContext) => void
  setIsPlaying: (playing: boolean) => void
  setIsCrossfading: (crossfading: boolean) => void
}

export const useMusicStore = create<MusicState>()((set) => ({
  context: 'menu',
  isPlaying: false,
  isCrossfading: false,

  setContext: (context) => set({ context }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsCrossfading: (isCrossfading) => set({ isCrossfading })
}))
