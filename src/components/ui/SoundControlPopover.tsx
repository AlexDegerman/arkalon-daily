'use client'

import { useCallback } from 'react'
import { useUiStore } from '@/app/stores/uiStore'

interface ChannelRowProps {
  label: string
  icon: string
  enabled: boolean
  volume: number
  onToggle: () => void
  onVolume: (v: number) => void
}

function ChannelRow({
  label,
  icon,
  enabled,
  volume,
  onToggle,
  onVolume
}: ChannelRowProps) {
  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value)
      onVolume(v)
      // Auto-enable when raising from 0; auto-disable when setting to 0
      if (v > 0 && !enabled) onToggle()
      if (v === 0 && enabled) onToggle()
    },
    [enabled, onToggle, onVolume]
  )

  return (
    <div className="flex flex-col gap-1 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <span>{icon}</span>
          <span>{label}</span>
        </div>
        <button
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label={`${enabled ? 'Disable' : 'Enable'} ${label}`}
          className={`h-5 w-9 rounded-full transition-colors focus-visible:outline focus-visible:outline-accent-recall ${
            enabled ? 'bg-accent-recall' : 'bg-border-subtle'
          }`}
        >
          <span
            className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolume}
          aria-label={`${label} volume`}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border-subtle accent-accent-recall"
        />
        <span className="w-8 text-right text-xs text-text-muted">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  )
}

export function SoundControlPopover() {
  const sfxEnabled = useUiStore((s) => s.sfxEnabled)
  const sfxVolume = useUiStore((s) => s.sfxVolume)
  const arkalonTTSEnabled = useUiStore((s) => s.arkalonTTSEnabled)
  const arkalonVolume = useUiStore((s) => s.arkalonVolume)
  const musicEnabled = useUiStore((s) => s.musicEnabled)
  const musicVolume = useUiStore((s) => s.musicVolume)

  const setSfxEnabled = useUiStore((s) => s.setSfxEnabled)
  const setSfxVolume = useUiStore((s) => s.setSfxVolume)
  const setArkalonTTSEnabled = useUiStore((s) => s.setArkalonTTSEnabled)
  const setArkalonVolume = useUiStore((s) => s.setArkalonVolume)
  const setMusicEnabled = useUiStore((s) => s.setMusicEnabled)
  const setMusicVolume = useUiStore((s) => s.setMusicVolume)

  return (
    <div
      className="w-64 rounded-xl border border-border-subtle bg-surface-panel p-4 shadow-xl"
      role="dialog"
      aria-label="Sound settings"
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Sound
      </p>
      <div className="divide-y divide-border-subtle">
        <ChannelRow
          label="Sound FX"
          icon={'\uD83D\uDD0A'}
          enabled={sfxEnabled}
          volume={sfxVolume}
          onToggle={() => setSfxEnabled(!sfxEnabled)}
          onVolume={setSfxVolume}
        />
        <ChannelRow
          label="Arkalon Voice"
          icon={'\uD83D\uDC41\uFE0F'}
          enabled={arkalonTTSEnabled}
          volume={arkalonVolume}
          onToggle={() => setArkalonTTSEnabled(!arkalonTTSEnabled)}
          onVolume={setArkalonVolume}
        />
        <ChannelRow
          label="Music"
          icon={'\uD83C\uDFB5'}
          enabled={musicEnabled}
          volume={musicVolume}
          onToggle={() => setMusicEnabled(!musicEnabled)}
          onVolume={setMusicVolume}
        />
      </div>
    </div>
  )
}
