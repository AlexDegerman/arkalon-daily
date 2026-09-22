'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  useMusicStore,
  BGM_TRACKS,
  type BGMContext
} from '@/app/stores/musicStore'
import { useUiStore } from '@/app/stores/uiStore'

const CROSSFADE_DURATION_MS = 1000
const CROSSFADE_STEPS = 20

export function useBGM() {
  const context = useMusicStore((s) => s.context)
  const trackId = useMusicStore((s) => s.trackId)
  const advanceTrack = useMusicStore((s) => s.advanceTrack)
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying)
  const setIsCrossfading = useMusicStore((s) => s.setIsCrossfading)
  const track =
    BGM_TRACKS[context].find((t) => t.id === trackId) ??
    BGM_TRACKS[context][0]
  const musicEnabled = useUiStore((s) => s.musicEnabled)
  const musicVolume = useUiStore((s) => s.musicVolume)

  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

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
    useMusicStore.getState().setContext(newContext)
  }, [])

  useEffect(() => {
    if (!musicEnabled) {
      stopCurrent(false)
      setIsPlaying(false)
      return
    }
    const src = track.src
    const prev = currentAudioRef.current
    // Already playing this track - compare by track path suffix
    if (prev && !prev.paused && prev.src.includes(src)) {
      return
    }
    setIsCrossfading(true)
    const audio = new Audio(src)
    audio.loop = track.loop
    audio.volume = 0
    // Non-looping tracks rotate to another track of the same context
    const handleEnded = () => advanceTrack()
    if (!track.loop) audio.addEventListener('ended', handleEnded)
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
      // Detach from the outgoing audio element; context switches are
      // handled above
      audio.removeEventListener('ended', handleEnded)
    }
  }, [track, musicEnabled, advanceTrack])
  // Browsers block autoplay until first interaction - retry once unlocked
  useEffect(() => {
    if (!musicEnabled) return
    function handleInteraction() {
      const audio = currentAudioRef.current
      if (audio && audio.paused) {
        audio.volume = musicVolume
        audio.play().catch(() => {
          // Still blocked - wait for the next interaction
        })
      }
    }
    const events = ['pointerdown', 'keydown', 'touchend'] as const
    events.forEach((e) =>
      window.addEventListener(e, handleInteraction, { passive: true })
    )
    return () =>
      events.forEach((e) => window.removeEventListener(e, handleInteraction))
  }, [musicEnabled, musicVolume])

  // Apply volume changes to the current track without restarting
  useEffect(() => {
    const audio = currentAudioRef.current
    if (!audio || audio.paused) return
    audio.volume = musicEnabled ? musicVolume : 0
  }, [musicVolume, musicEnabled])

  return { switchContext }
}
