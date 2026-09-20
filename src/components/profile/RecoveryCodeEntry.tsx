'use client'

import { useState, useCallback } from 'react'

interface RecoveryCodeEntryProps {
  onRestore: (code: string) => Promise<{ success: boolean; error?: string }>
}

// Code entry form for restoring a profile from a recovery code.
export function RecoveryCodeEntry({ onRestore }: RecoveryCodeEntryProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const handleSubmit = useCallback(async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    const result = await onRestore(trimmed)
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Code not found. Check for typos and try again.')
    }
  }, [code, onRestore])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit()
    },
    [handleSubmit]
  )

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-text-muted underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-accent-recall"
      >
        Restore from code
      </button>
    )
  }

  return (
    <div className="w-full rounded-xl border border-border-subtle bg-surface-panel p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-text-muted">
        Restore from Code
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="WORD-WORD-0000"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label="Recovery code"
          className="flex-1 rounded-lg border border-border-subtle bg-bg-base px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus-visible:border-accent-recall focus-visible:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
          aria-busy={loading}
          className="rounded-lg bg-accent-recall px-4 py-2 text-xs font-semibold text-bg-base transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          {loading ? '...' : 'RESTORE'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-status-fail">
          {error}
        </p>
      )}
    </div>
  )
}
