'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { SoundControlPopover } from './SoundControlPopover'
import { useUiStore } from '@/app/stores/uiStore'

export function SoundControlButton() {
  const sfxEnabled = useUiStore((s) => s.sfxEnabled)
  const musicEnabled = useUiStore((s) => s.musicEnabled)
  const arkalonTTSEnabled = useUiStore((s) => s.arkalonTTSEnabled)
  const anySoundOn = sfxEnabled || musicEnabled || arkalonTTSEnabled

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback(() => setOpen((v) => !v), [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        aria-label="Sound settings"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent-recall"
      >
        {anySoundOn ? (
          <Volume2 size={20} aria-hidden="true" />
        ) : (
          <VolumeX size={20} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40">
          <SoundControlPopover />
        </div>
      )}
    </div>
  )
}
