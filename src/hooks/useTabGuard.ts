'use client'

import { useEffect } from 'react'

// Detects duplicate browser tabs using BroadcastChannel.
// Calls the callback when another active tab is detected.
export function useTabGuard(onDuplicateTab?: () => void) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return

    const channel = new BroadcastChannel('arkalon_daily_tab')

    channel.postMessage({ type: 'tab-open' })

    channel.onmessage = (event) => {
      if (event.data?.type === 'tab-open') {
        channel.postMessage({ type: 'tab-exists' })
      }
      if (event.data?.type === 'tab-exists') {
        onDuplicateTab?.()
      }
    }

    return () => {
      channel.close()
    }
  }, [onDuplicateTab])
}
