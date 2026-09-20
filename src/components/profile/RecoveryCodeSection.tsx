'use client'

import { useCallback, useState } from 'react'

interface RecoveryCodeSectionProps {
  recoveryCode: string
}

export function RecoveryCodeSection({
  recoveryCode
}: RecoveryCodeSectionProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable - silently ignore
    }
  }, [recoveryCode])

  return (
    <div className="w-full rounded-xl border border-border-subtle bg-surface-panel p-4">
      <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
        Recovery Code
      </p>
      <p className="mb-3 text-xs text-text-muted">
        Save this code to restore your profile on another device.
      </p>
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-bg-base px-4 py-3">
        <code className="flex-1 font-mono text-sm font-semibold tracking-widest text-text-primary">
          {recoveryCode}
        </code>
        <button
          onClick={handleCopy}
          aria-label="Copy recovery code"
          className="text-xs font-semibold text-accent-recall transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>
      <p className="text-xs text-text-muted">
        Your code: <strong className="text-text-primary">{recoveryCode}</strong>
      </p>
    </div>
  )
}
