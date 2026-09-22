'use client'
import { useCallback, useRef, useEffect } from 'react'
import { useUiStore } from '@/app/stores/uiStore'

export type SoundKey =
  | 'correct'
  | 'incorrect'
  | 'sequence-tick'
  | 'round-complete'
  | 'shot-basic'
  | 'shot-perfect'
  | 'node-hit'
  | 'decoy-hit'
  | 'surge-end'
  | 'crystal-found'
  | 'dig-empty'
  | 'mark-tile'
  | 'cipher-next'
  | 'timer-tick'
  | 'result-mythical'
  | 'result-legendary'
  | 'result-epic'
  | 'result-rare'
  | 'result-common'
  | 'streak-7'
  | 'streak-30'
  | 'streak-100'
  | 'streak-365'

const SOUND_MAP: Record<SoundKey, string> = {
  correct: '/sounds/correct.wav',
  incorrect: '/sounds/incorrect.wav',
  'sequence-tick': '/sounds/sequence-tick.mp3',
  'round-complete': '/sounds/round-complete.mp3',
  'shot-basic': '/sounds/shot-basic.mp3',
  'shot-perfect': '/sounds/shot-perfect.mp3',
  'node-hit': '/sounds/node-hit.mp3',
  'decoy-hit': '/sounds/decoy-hit.wav',
  'surge-end': '/sounds/surge-end.mp3',
  'crystal-found': '/sounds/crystal-found.mp3',
  'dig-empty': '/sounds/dig-empty.mp3',
  'mark-tile': '/sounds/mark-tile.wav',
  'cipher-next': '/sounds/cipher-next.wav',
  'timer-tick': '/sounds/timer-tick.mp3',
  'result-mythical': '/sounds/result_mythical.mp3',
  'result-legendary': '/sounds/result_legendary.mp3',
  'result-epic': '/sounds/result_epic.mp3',
  'result-rare': '/sounds/result_rare.mp3',
  'result-common': '/sounds/result_common.mp3',
  'streak-7': '/sounds/streak-7.mp3',
  'streak-30': '/sounds/streak-30.mp3',
  'streak-100': '/sounds/streak-100.mp3',
  'streak-365': '/sounds/streak-365.mp3'
}

// Per-channel volume multipliers applied on top of the user's slider setting.
// Sounds missing from this map use the default volume.
// Add an entry only when a specific effect needs attenuation.
const VOLUME_MULTIPLIERS: Partial<Record<SoundKey, number>> = {
  // 'shot-perfect': 0.6
}

// Standard HTML5 Audio pool for non-rapid sounds
const POOL_SIZE = 3
const poolRef = new Map<
  SoundKey,
  { elements: HTMLAudioElement[]; index: number }
>()

// Web Audio API setup for polyphonic rapid-tap sounds (Surge nodes, Depths crystals)
type PolyKey = 'node-hit' | 'crystal-found'
const POLY_KEYS: PolyKey[] = ['node-hit', 'crystal-found']
let audioCtx: AudioContext | null = null
// One decoded buffer per polyphonic key so each keeps its own sound
const polyBuffers: Partial<Record<PolyKey, AudioBuffer>> = {}
let masterGain: GainNode | null = null
const activePolyClicks: { source: AudioBufferSourceNode; gain: GainNode }[] = []
const MAX_POLY = 6

async function initPolyAudio(): Promise<void> {
  if (audioCtx) return
  audioCtx = new AudioContext()
  masterGain = audioCtx.createGain()
  // Master gain stays at 1; per-instance gain already includes user volume
  masterGain.connect(audioCtx.destination)
  const ctx = audioCtx
  await Promise.all(
    POLY_KEYS.map(async (key) => {
      try {
        const res = await fetch(SOUND_MAP[key])
        const arrBuf = await res.arrayBuffer()
        polyBuffers[key] = await ctx.decodeAudioData(arrBuf)
      } catch {
        // That polyphonic key stays silent until its buffer loads
      }
    })
  )
}

function playPolySound(key: PolyKey, volume: number): void {
  const buffer = polyBuffers[key]
  if (!audioCtx || !buffer || !masterGain) return
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})

  if (activePolyClicks.length >= MAX_POLY) {
    const oldest = activePolyClicks.shift()
    if (oldest) {
      oldest.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.015)
      setTimeout(() => {
        try {
          oldest.source.stop()
        } catch {}
      }, 60)
    }
  }

  const source = audioCtx.createBufferSource()
  source.buffer = buffer
  const instanceGain = audioCtx.createGain()
  instanceGain.gain.value = volume
  source.connect(instanceGain)
  instanceGain.connect(masterGain)

  const entry = { source, gain: instanceGain }
  activePolyClicks.push(entry)
  source.onended = () => {
    const idx = activePolyClicks.indexOf(entry)
    if (idx !== -1) activePolyClicks.splice(idx, 1)
  }
  source.start()
}

export function useSound() {
  const sfxEnabled = useUiStore((s) => s.sfxEnabled)
  const sfxVolume = useUiStore((s) => s.sfxVolume)
  const sfxEnabledRef = useRef(sfxEnabled)
  const sfxVolumeRef = useRef(sfxVolume)

  useEffect(() => {
    sfxEnabledRef.current = sfxEnabled
  }, [sfxEnabled])

  useEffect(() => {
    sfxVolumeRef.current = sfxVolume
  }, [sfxVolume])

  // Pre-decode the polyphonic buffer on first interaction
  useEffect(() => {
    const init = () => {
      initPolyAudio()
      document.removeEventListener('pointerdown', init)
    }
    document.addEventListener('pointerdown', init)
    return () => document.removeEventListener('pointerdown', init)
  }, [])

  const play = useCallback((key: SoundKey) => {
    if (!sfxEnabledRef.current || typeof window === 'undefined') return
    const vol = Math.min(
      1,
      sfxVolumeRef.current * (VOLUME_MULTIPLIERS[key] ?? 1)
    )

    // Route rapid-tap sounds through the Web Audio API polyphony engine
    if (key === 'node-hit' || key === 'crystal-found') {
      playPolySound(key, vol)
      return
    }

    // Standard pool for everything else
    let pool = poolRef.get(key)
    if (!pool) {
      const elements: HTMLAudioElement[] = []
      for (let i = 0; i < POOL_SIZE; i++) {
        const audio = new Audio(SOUND_MAP[key])
        audio.preload = 'auto'
        elements.push(audio)
      }
      pool = { elements, index: 0 }
      poolRef.set(key, pool)
    }

    const audio = pool.elements[pool.index % POOL_SIZE]
    pool.index = (pool.index + 1) % POOL_SIZE
    audio.currentTime = 0
    audio.volume = vol
    audio.play().catch(() => {})
  }, [])

  return { play }
}
