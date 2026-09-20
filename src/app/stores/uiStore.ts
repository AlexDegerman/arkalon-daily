'use client'

import { create } from 'zustand'

export type ModalId = 'welcome' | 'update' | null

export type OverlayId =
  | 'streak-milestone'
  | 'trial-complete'
  | 'share-preview'
  | 'recovery-tutorial'
  | null

export interface PopupEntry {
  id: string
  priority: number
  content: string
}

interface UiState {
  activeModal: ModalId
  activeOverlay: OverlayId
  popupQueue: PopupEntry[]
  arkalonTTSEnabled: boolean
  arkalonVolume: number
  sfxEnabled: boolean
  sfxVolume: number
  musicEnabled: boolean
  musicVolume: number

  setActiveModal: (modal: ModalId) => void
  setActiveOverlay: (overlay: OverlayId) => void
  pushPopup: (entry: PopupEntry) => void
  dismissPopup: (id: string) => void
  setArkalonTTSEnabled: (enabled: boolean) => void
  setArkalonVolume: (volume: number) => void
  setSfxEnabled: (enabled: boolean) => void
  setSfxVolume: (volume: number) => void
  setMusicEnabled: (enabled: boolean) => void
  setMusicVolume: (volume: number) => void
}

export const useUiStore = create<UiState>()((set) => ({
  activeModal: null,
  activeOverlay: null,
  popupQueue: [],
  arkalonTTSEnabled: true,
  arkalonVolume: 0.5,
  sfxEnabled: true,
  sfxVolume: 0.72,
  musicEnabled: true,
  musicVolume: 0.3,

  setActiveModal: (modal) => set({ activeModal: modal }),
  setActiveOverlay: (overlay) => set({ activeOverlay: overlay }),

  pushPopup: (entry) =>
    set((state) => ({
      popupQueue: [...state.popupQueue, entry].sort(
        (a, b) => b.priority - a.priority
      )
    })),

  dismissPopup: (id) =>
    set((state) => ({
      popupQueue: state.popupQueue.filter((p) => p.id !== id)
    })),

  setArkalonTTSEnabled: (enabled) => set({ arkalonTTSEnabled: enabled }),
  setArkalonVolume: (volume) => set({ arkalonVolume: volume }),
  setSfxEnabled: (enabled) => set({ sfxEnabled: enabled }),
  setSfxVolume: (volume) => set({ sfxVolume: volume }),
  setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
  setMusicVolume: (volume) => set({ musicVolume: volume })
}))
