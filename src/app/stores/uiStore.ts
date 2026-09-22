'use client'

import { create } from 'zustand'

interface UiState {
  showWelcomeModal: boolean
  showUpdateModal: boolean
  arkalonTTSEnabled: boolean
  arkalonVolume: number
  sfxEnabled: boolean
  sfxVolume: number
  musicEnabled: boolean
  musicVolume: number
  setShowWelcomeModal: (open: boolean) => void
  setShowUpdateModal: (open: boolean) => void
  setArkalonTTSEnabled: (enabled: boolean) => void
  setArkalonVolume: (volume: number) => void
  setSfxEnabled: (enabled: boolean) => void
  setSfxVolume: (volume: number) => void
  setMusicEnabled: (enabled: boolean) => void
  setMusicVolume: (volume: number) => void
}

export const useUiStore = create<UiState>()((set) => ({
  showWelcomeModal: false,
  showUpdateModal: false,
  arkalonTTSEnabled: true,
  arkalonVolume: 0.5,
  sfxEnabled: true,
  sfxVolume: 0.72,
  musicEnabled: true,
  musicVolume: 0.3,
  setShowWelcomeModal: (open) => set({ showWelcomeModal: open }),
  setShowUpdateModal: (open) => set({ showUpdateModal: open }),
  setArkalonTTSEnabled: (enabled) => set({ arkalonTTSEnabled: enabled }),
  setArkalonVolume: (volume) => set({ arkalonVolume: volume }),
  setSfxEnabled: (enabled) => set({ sfxEnabled: enabled }),
  setSfxVolume: (volume) => set({ sfxVolume: volume }),
  setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
  setMusicVolume: (volume) => set({ musicVolume: volume })
}))
