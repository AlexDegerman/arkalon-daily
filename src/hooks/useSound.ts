'use client'

import { useCallback, useRef } from 'react'
import { useUiStore } from '@/app/stores/uiStore'

// All available sound effect keys
export type SoundKey =
  | 'correct'
  | 'incorrect'
  | 'round-complete'
  | 'perfect-shot'
  | 'node-hit'
  | 'decoy-hit'
  | 'deposit-found'
  | 'charge-spent'
  | 'result-legendary'
  | 'result-epic'
  | 'result-rare'
  | 'result-common'
  | 'streak-7'
  | 'streak-30'
  | 'streak-100'
  | 'streak-365'

export const SOUND_MAP: Record<SoundKey, string> = {
  correct: '/sounds/correct.mp3',
  incorrect: '/sounds/incorrect.mp3',
  'round-complete': '/sounds/round-complete.mp3',
  'perfect-shot': '/sounds/perfect-shot.mp3',
  'node-hit': '/sounds/node-hit.mp3',
  'decoy-hit': '/sounds/decoy-hit.mp3',
  'deposit-found': '/sounds/deposit-found.mp3',
  'charge-spent': '/sounds/charge-spent.mp3',
  'result-legendary': '/sounds/result-legendary.mp3',
  'result-epic': '/sounds/result-epic.mp3',
  'result-rare': '/sounds/result-rare.mp3',
  'result-common': '/sounds/result-common.mp3',
  'streak-7': '/sounds/streak-7.mp3',
  'streak-30': '/sounds/streak-30.mp3',
  'streak-100': '/sounds/streak-100.mp3',
  'streak-365': '/sounds/streak-365.mp3'
}

// Per-channel volume multipliers applied on top of the user's slider setting
const VOLUME_MULTIPLIERS: Record<SoundKey, number> = {
  correct: 1.0,
  incorrect: 0.8,
  'round-complete': 1.0,
  'perfect-shot': 1.0,
  'node-hit': 0.9,
  'decoy-hit': 1.0,
  'deposit-found': 1.0,
  'charge-spent': 0.7,
  'result-legendary': 1.0,
  'result-epic': 1.0,
  'result-rare': 1.0,
  'result-common': 0.8,
  'streak-7': 1.0,
  'streak-30': 1.0,
  'streak-100': 1.0,
  'streak-365': 1.0
}

// Small pool per sound key to allow polyphonic playback (e.g. rapid node hits)
const POOL_SIZE = 3

export function useSound() {
  const sfxEnabled = useUiStore((s) => s.sfxEnabled)
  const sfxVolume = useUiStore((s) => s.sfxVolume)

  // Audio pool: key -> circular buffer of HTMLAudioElement
  const poolRef = useRef<
    Map<SoundKey, { elements: HTMLAudioElement[]; index: number }>
  >(new Map())

  const getPoolEntry = useCallback((key: SoundKey) => {
    const pool = poolRef.current
    if (!pool.has(key)) {
      const elements: HTMLAudioElement[] = []
      for (let i = 0; i < POOL_SIZE; i++) {
        const audio = new Audio(SOUND_MAP[key])
        audio.preload = 'auto'
        elements.push(audio)
      }
      pool.set(key, { elements, index: 0 })
    }
    return pool.get(key)!
  }, [])

  const play = useCallback(
    (key: SoundKey) => {
      if (!sfxEnabled || typeof window === 'undefined') return
      const entry = getPoolEntry(key)
      const audio = entry.elements[entry.index % POOL_SIZE]
      entry.index = (entry.index + 1) % POOL_SIZE
      audio.currentTime = 0
      audio.volume = Math.min(1, sfxVolume * VOLUME_MULTIPLIERS[key])
      audio.play().catch(() => {
        // Autoplay blocked - silently ignore
      })
    },
    [sfxEnabled, sfxVolume, getPoolEntry]
  )

  // Plays a sequence of sounds with a delay between each
  const playChain = useCallback(
    (keys: SoundKey[], delayMs: number) => {
      keys.forEach((key, i) => {
        setTimeout(() => play(key), i * delayMs)
      })
    },
    [play]
  )

  return { play, playChain }
}
