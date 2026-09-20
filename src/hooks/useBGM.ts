'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  useMusicStore,
  BGMContext,
  BGM_TRACK_MAP
} from '@/app/stores/musicStore'
import { useUiStore } from '@/app/stores/uiStore'

const CROSSFADE_DURATION_MS = 1000
const CROSSFADE_STEPS = 20

export function useBGM() {
  const context = useMusicStore((s) => s.context)
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying)
  const setIsCrossfading = useMusicStore((s) => s.setIsCrossfading)
  const musicEnabled = useUiStore((s) => s.musicEnabled)
  const musicVolume = useUiStore((s) => s.musicVolume)

  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const targetContextRef = useRef<BGMContext>(context)

  const stopCurrent = useCallback((fadeOut = true) => {
    const audio = currentAudioRef.current
    if (!audio) return
    if (!fadeOut) {
      audio.pause()
      audio.currentTime = 0
      return
    }
    // Fade out
    const startVol = audio.volume
    const step = startVol / CROSSFADE_STEPS
    const intervalMs = CROSSFADE_DURATION_MS / CROSSFADE_STEPS
    const fade = setInterval(() => {
      if (audio.volume > step) {
        audio.volume = Math.max(0, audio.volume - step)
      } else {
        audio.volume = 0
        audio.pause()
        audio.currentTime = 0
        clearInterval(fade)
      }
    }, intervalMs)
  }, [])

  const switchContext = useCallback((newContext: BGMContext) => {
    targetContextRef.current = newContext
    useMusicStore.getState().setContext(newContext)
  }, [])

  useEffect(() => {
    if (!musicEnabled) {
      stopCurrent(false)
      setIsPlaying(false)
      return
    }

    const track = BGM_TRACK_MAP[context]
    const prev = currentAudioRef.current

    // Already playing this track - compare by track path suffix
    if (prev && !prev.paused && prev.src.includes(track)) {
      return
    }

    setIsCrossfading(true)

    const audio = new Audio(track)
    audio.loop = true
    audio.volume = 0

    if (prev) stopCurrent(true)
    currentAudioRef.current = audio

    audio
      .play()
      .then(() => {
        setIsPlaying(true)
        // Fade in
        const targetVol = musicVolume
        const step = targetVol / CROSSFADE_STEPS
        const intervalMs = CROSSFADE_DURATION_MS / CROSSFADE_STEPS
        const fade = setInterval(() => {
          if (audio.volume < targetVol - step) {
            audio.volume = Math.min(targetVol, audio.volume + step)
          } else {
            audio.volume = targetVol
            clearInterval(fade)
            setIsCrossfading(false)
          }
        }, intervalMs)
      })
      .catch(() => {
        // Autoplay blocked - wait for user interaction
        setIsCrossfading(false)
      })

    return () => {
      // Cleanup on unmount only - context switches are handled above
    }
  }, [context, musicEnabled])

  // Apply volume changes to the current track without restarting
  useEffect(() => {
    const audio = currentAudioRef.current
    if (!audio || audio.paused) return
    audio.volume = musicEnabled ? musicVolume : 0
  }, [musicVolume, musicEnabled])

  return { switchContext }
}
