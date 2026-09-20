'use client'

import { useUiStore, PopupEntry } from '@/app/stores/uiStore'
import { useCallback } from 'react'

// Convenience hook for pushing and dismissing entries in the popup queue.
export function usePopupQueue() {
  const popupQueue = useUiStore((s) => s.popupQueue)
  const pushPopup = useUiStore((s) => s.pushPopup)
  const dismissPopup = useUiStore((s) => s.dismissPopup)

  const push = useCallback((entry: PopupEntry) => pushPopup(entry), [pushPopup])

  const dismiss = useCallback((id: string) => dismissPopup(id), [dismissPopup])

  const current = popupQueue[0] ?? null

  return { current, queue: popupQueue, push, dismiss }
}
