'use client'

import { useEffect } from 'react'
import { speakArkalon } from '@/lib/arkalonTTS'
import { primeArkalonVoices, unlockArkalon } from '@/lib/arkalonTTS'
import { useUiStore } from '@/app/stores/uiStore'
import { TTS_LINES } from '@/lib/ttsLines'
import { WelcomeModal } from '@/components/modals/WelcomeModal'
import { UpdateModal } from '@/components/modals/UpdateModal'

// Client-only homepage side-effects: TTS daily welcome, modal checks,
// and voice priming on first user interaction.
export function HomepageClient() {
  const arkalonTTSEnabled = useUiStore((s) => s.arkalonTTSEnabled)
  const arkalonVolume = useUiStore((s) => s.arkalonVolume)

  // Prime voices on first user interaction (required by some browsers)
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
        // Delay slightly so the page is settled before speaking
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
    </>
  )
}
