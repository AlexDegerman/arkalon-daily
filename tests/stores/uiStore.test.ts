import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '@/app/stores/uiStore'

const INITIAL = {
  showWelcomeModal: false,
  showUpdateModal: false,
  arkalonTTSEnabled: true,
  arkalonVolume: 0.5,
  sfxEnabled: true,
  sfxVolume: 0.72,
  musicEnabled: true,
  musicVolume: 0.3
}

beforeEach(() => {
  useUiStore.setState(INITIAL)
})

describe('useUiStore', () => {
  it('starts with sound enabled and modals closed', () => {
    const s = useUiStore.getState()
    expect(s.showWelcomeModal).toBe(false)
    expect(s.showUpdateModal).toBe(false)
    expect(s.sfxEnabled).toBe(true)
    expect(s.musicEnabled).toBe(true)
    expect(s.arkalonTTSEnabled).toBe(true)
  })

  it('toggles the welcome and update modals', () => {
    useUiStore.getState().setShowWelcomeModal(true)
    expect(useUiStore.getState().showWelcomeModal).toBe(true)
    useUiStore.getState().setShowUpdateModal(true)
    expect(useUiStore.getState().showUpdateModal).toBe(true)
    useUiStore.getState().setShowWelcomeModal(false)
    expect(useUiStore.getState().showWelcomeModal).toBe(false)
  })

  it('updates sound channel flags and volumes independently', () => {
    const s = useUiStore.getState()
    s.setSfxEnabled(false)
    s.setSfxVolume(0.2)
    s.setMusicVolume(0.9)
    s.setArkalonTTSEnabled(false)
    s.setArkalonVolume(1)
    const next = useUiStore.getState()
    expect(next.sfxEnabled).toBe(false)
    expect(next.sfxVolume).toBe(0.2)
    expect(next.musicVolume).toBe(0.9)
    expect(next.musicEnabled).toBe(true) // untouched
    expect(next.arkalonTTSEnabled).toBe(false)
    expect(next.arkalonVolume).toBe(1)
  })
})
