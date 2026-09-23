'use client'

import { useEffect } from 'react'
import { WelcomeModal } from '@/components/modals/WelcomeModal'
import { UpdateModal } from '@/components/modals/UpdateModal'
import { BottomNav } from '@/components/layout/BottomNav'
import { SoundControlButton } from '@/components/ui/SoundControlButton'
import {
  speakArkalon,
  primeArkalonVoices,
  unlockArkalon
} from '@/lib/arkalonTTS'
import { useUiStore } from '@/app/stores/uiStore'
import { TTS_LINES } from '@/lib/ttsLines'
import { useActiveView } from '@/hooks/useActiveView'
import { useBGM } from '@/hooks/useBGM'
import { TopNavDeck } from '@/components/layout/TopNavDeck'
import { useMusicStore } from '@/app/stores/musicStore'

// Hydrates sound preferences from localStorage on mount
function useSoundPersistence() {
  const setSfxEnabled = useUiStore((s) => s.setSfxEnabled)
  const setSfxVolume = useUiStore((s) => s.setSfxVolume)
  const setArkalonTTSEnabled = useUiStore((s) => s.setArkalonTTSEnabled)
  const setArkalonVolume = useUiStore((s) => s.setArkalonVolume)
  const setMusicEnabled = useUiStore((s) => s.setMusicEnabled)
  const setMusicVolume = useUiStore((s) => s.setMusicVolume)

  // Read on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('arkalon_daily_sound_prefs')
      if (!raw) return
      const prefs = JSON.parse(raw)
      if (typeof prefs.sfxEnabled === 'boolean') setSfxEnabled(prefs.sfxEnabled)
      if (typeof prefs.sfxVolume === 'number') setSfxVolume(prefs.sfxVolume)
      if (typeof prefs.arkalonTTSEnabled === 'boolean')
        setArkalonTTSEnabled(prefs.arkalonTTSEnabled)
      if (typeof prefs.arkalonVolume === 'number')
        setArkalonVolume(prefs.arkalonVolume)
      if (typeof prefs.musicEnabled === 'boolean')
        setMusicEnabled(prefs.musicEnabled)
      if (typeof prefs.musicVolume === 'number')
        setMusicVolume(prefs.musicVolume)
    } catch {
      // localStorage unavailable
    }
  }, [
    setSfxEnabled,
    setSfxVolume,
    setArkalonTTSEnabled,
    setArkalonVolume,
    setMusicEnabled,
    setMusicVolume
  ])
}

// Writes sound preferences to localStorage whenever they change
function useSoundPersistenceWrite() {
  const sfxEnabled = useUiStore((s) => s.sfxEnabled)
  const sfxVolume = useUiStore((s) => s.sfxVolume)
  const arkalonTTSEnabled = useUiStore((s) => s.arkalonTTSEnabled)
  const arkalonVolume = useUiStore((s) => s.arkalonVolume)
  const musicEnabled = useUiStore((s) => s.musicEnabled)
  const musicVolume = useUiStore((s) => s.musicVolume)

  useEffect(() => {
    try {
      localStorage.setItem(
        'arkalon_daily_sound_prefs',
        JSON.stringify({
          sfxEnabled,
          sfxVolume,
          arkalonTTSEnabled,
          arkalonVolume,
          musicEnabled,
          musicVolume
        })
      )
    } catch {
      // localStorage unavailable
    }
  }, [
    sfxEnabled,
    sfxVolume,
    arkalonTTSEnabled,
    arkalonVolume,
    musicEnabled,
    musicVolume
  ])
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const arkalonTTSEnabled = useUiStore((s) => s.arkalonTTSEnabled)
  const arkalonVolume = useUiStore((s) => s.arkalonVolume)
  const activeView = useActiveView()
  useSoundPersistence()
  useSoundPersistenceWrite()
  useBGM()

  useEffect(() => {
    if (activeView !== 'game') {
      useMusicStore.getState().setContext('menu')
    }
  }, [activeView])

  // Prime voices on first interaction
  useEffect(() => {
    primeArkalonVoices()
    function handleInteraction() {
      unlockArkalon()
      document.removeEventListener('pointerdown', handleInteraction)
    }
    document.addEventListener('pointerdown', handleInteraction)
    return () => document.removeEventListener('pointerdown', handleInteraction)
  }, [])

  // Daily welcome TTS - once per UTC day
  useEffect(() => {
    if (!arkalonTTSEnabled) return
    try {
      const today = new Date().toISOString().slice(0, 10)
      const lastWelcome = localStorage.getItem('arkalon_daily_last_welcome')
      if (lastWelcome !== today) {
        const timer = setTimeout(() => {
          speakArkalon(TTS_LINES.dailyWelcome, arkalonVolume)
          localStorage.setItem('arkalon_daily_last_welcome', today)
        }, 800)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage unavailable
    }
  }, [arkalonTTSEnabled, arkalonVolume])

  return (
    <>
      <WelcomeModal />
      <UpdateModal />
      {activeView !== 'game' && <TopNavDeck />}
      {children}
    </>
  )
}
