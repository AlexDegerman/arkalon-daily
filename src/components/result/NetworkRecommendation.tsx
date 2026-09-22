'use client'
import { useState } from 'react'
import {
  pickNetworkRecommendation,
  NETWORK_HUB_URL
} from '@/lib/networkRecommendations'

export function NetworkRecommendation() {
  // One random pick per result screen; a single-entry pool always shows
  const [rec] = useState(pickNetworkRecommendation)
  if (!rec) return null
  return (
    <div className="w-full border-t border-border-subtle pt-6">
      <p className="mb-2 text-xs uppercase tracking-wider text-text-muted">
        Arkalon Network
      </p>
      <div className="rounded-xl border border-border-subtle bg-surface-panel p-4">
        <a
          href={rec.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-accent-recall transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          {rec.appName} &rarr;
        </a>
        <p className="mt-1 mb-3 text-xs text-text-muted">{rec.tagline}</p>
        <a
          href={NETWORK_HUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs font-semibold text-text-muted transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          Explore the Arkalon Network &rarr;
        </a>
      </div>
    </div>
  )
}
