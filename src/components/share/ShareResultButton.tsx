'use client'

import { useRef, useState, useCallback } from 'react'
import { ShareResultCard } from './ShareResultCard'
import { generateShareImage } from './generateShareImage'
import type { ShareResult } from '@/types/puzzle'
import { CATEGORIES } from '@/constants/categories'

interface ShareResultButtonProps {
  result: ShareResult
}

export function ShareResultButton({ result }: ShareResultButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [fallback, setFallback] = useState<'none' | 'download' | 'copied'>(
    'none'
  )
  const cat = CATEGORIES[result.category]

  const shareText = `I scored ${result.score}/100 on today's ${cat.displayName} puzzle! ${result.streakDays > 0 ? `\uD83D\uDD25 ${result.streakDays}-day streak` : ''}`

  const handleShare = useCallback(async () => {
    if (sharing || !cardRef.current) return
    setSharing(true)
    setFallback('none')

    try {
      const blob = await generateShareImage(cardRef.current)

      if (!blob) {
        // Image generation failed - fall back to text-only share
        if (navigator.share) {
          await navigator.share({
            title: `Arkalon Daily - ${cat.displayName} #${result.familyIndex}`,
            text: shareText,
            url: result.url
          })
        } else {
          await navigator.clipboard.writeText(`${shareText} ${result.url}`)
          setFallback('copied')
        }
        return
      }

      const file = new File([blob], 'arkalon-daily-result.png', {
        type: 'image/png'
      })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Arkalon Daily - ${cat.displayName} #${result.familyIndex}`,
          text: shareText,
          url: result.url,
          files: [file]
        })
      } else {
        // Desktop fallback: download image + copy text
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'arkalon-daily-result.png'
        a.click()
        URL.revokeObjectURL(url)

        try {
          await navigator.clipboard.writeText(`${shareText} ${result.url}`)
          setFallback('copied')
        } catch {
          setFallback('download')
        }
      }
    } catch (err) {
      // User cancelled share or other error - silently ignore
    } finally {
      setSharing(false)
    }
  }, [sharing, result, shareText, cat])

  return (
    <>
      {/* Offscreen card for rendering */}
      <ShareResultCard ref={cardRef} result={result} />

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleShare}
          disabled={sharing}
          aria-busy={sharing}
          aria-label="Share result"
          className="w-full rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold tracking-wider text-text-primary transition-opacity hover:opacity-80 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          {sharing ? 'Generating...' : '[ SHARE ]'}
        </button>

        {fallback === 'copied' && (
          <p
            className="text-xs text-status-success"
            role="status"
            aria-live="polite"
          >
            Share text copied to clipboard
          </p>
        )}
        {fallback === 'download' && (
          <p
            className="text-xs text-text-muted"
            role="status"
            aria-live="polite"
          >
            Image downloaded
          </p>
        )}
      </div>
    </>
  )
}
