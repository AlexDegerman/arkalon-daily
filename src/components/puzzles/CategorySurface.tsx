'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GameHeader } from '@/components/layout/GameHeader'
import { BottomNav } from '@/components/layout/BottomNav'
import { TrialExplainer } from '@/components/trial/TrialExplainer'
import { ResultScreen } from '@/components/result/ResultScreen'
import { ArkalonVision } from './ArkalonVision'
import { getDailyChallenge } from '@/app/actions/getDailyChallenge'
import { completeTrial } from '@/app/actions/completeTrial'
import { submitResult } from '@/app/actions/submitResult'
import { usePuzzleStore } from '@/app/stores/puzzleStore'
import { useUiStore } from '@/app/stores/uiStore'
import { speakArkalon } from '@/lib/arkalonTTS'
import { useSound } from '@/hooks/useSound'
import { getScoreTierClass } from '@/lib/format'
import { CATEGORIES } from '@/constants/categories'
import type { ArkalonVisionData } from '@/lib/puzzles/families/arkalonVision'
import type { ArkalonVisionResult } from './ArkalonVision'
import type {
  PuzzleCategory,
  CategoryStatus,
  DailyPuzzleInfo,
  PuzzleSeedData
} from '@/types/puzzle'
import { CATEGORY_ORDER } from '@/constants/categories'

type SurfacePhase =
  | 'loading'
  | 'trial-explainer'
  | 'playing'
  | 'submitting'
  | 'result'
  | 'already-played'
  | 'error'

interface CategorySurfaceProps {
  category: PuzzleCategory
}

// Dummy statuses used for the continuation panel until we have live data in Commit 6.2
function buildPlaceholderStatuses(
  currentCategory: PuzzleCategory,
  currentStatus: 'solved' | 'failed',
  currentScore: number
): CategoryStatus[] {
  return CATEGORY_ORDER.map((slug) => ({
    category: slug,
    status: slug === currentCategory ? currentStatus : 'available',
    score: slug === currentCategory ? currentScore : undefined,
    streakDays: 0,
    trialCompleted: true
  }))
}

export function CategorySurface({ category }: CategorySurfaceProps) {
  const router = useRouter()
  const { play } = useSound()
  const arkalonTTSEnabled = useUiStore((s) => s.arkalonTTSEnabled)
  const arkalonVolume = useUiStore((s) => s.arkalonVolume)

  const [phase, setPhase] = useState<SurfacePhase>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isTrial, setIsTrial] = useState(false)
  const [puzzleInfo, setPuzzleInfo] = useState<DailyPuzzleInfo | null>(null)
  const [seedData, setSeedData] = useState<PuzzleSeedData | null>(null)
  const [resultScore, setResultScore] = useState<number>(0)
  const [resultStatus, setResultStatus] = useState<'solved' | 'failed'>(
    'solved'
  )
  const [resultElapsedMs, setResultElapsedMs] = useState<number>(0)
  const [resultMetrics, setResultMetrics] = useState<Record<string, unknown>>(
    {}
  )
  const [streakDays, setStreakDays] = useState<number>(0)
  const [trialsCompleted, setTrialsCompleted] = useState<string[]>([])
  const [rawMetrics, setRawMetrics] = useState<
    Parameters<typeof submitResult>[0]['familyMetrics'] | null
  >(null)

  const playerIdRef = useRef<string | null>(null)

  // Retrieve playerId from localStorage
  function getPlayerId(): string | null {
    try {
      return localStorage.getItem('arkalon_daily_player_id')
    } catch {
      return null
    }
  }

  // Load challenge on mount
  useEffect(() => {
    const playerId = getPlayerId()
    playerIdRef.current = playerId

    if (!playerId) {
      // No player ID yet - redirect home so WelcomeModal can fire
      router.replace('/')
      return
    }

    getDailyChallenge(playerId, category).then((res) => {
      if (!res.success) {
        setErrorMsg(res.error ?? 'Failed to load puzzle')
        setPhase('error')
        return
      }

      if (res.alreadyPlayed) {
        setPhase('already-played')
        return
      }

      setTrialsCompleted(res.trialsCompleted ?? [])
      setStreakDays(res.streakDays ?? 0)
      setPuzzleInfo(res.puzzleInfo!)
      setSeedData(res.seedData!)

      const needsTrial = !res.trialsCompleted?.includes(category)
      if (needsTrial) {
        setPhase('trial-explainer')
      } else {
        setPhase('playing')
        setIsTrial(false)
      }
    })
  }, [category, router])

  const handleTrialBegin = useCallback(() => {
    setIsTrial(true)
    setPhase('playing')
  }, [])

  const handleTrialSkip = useCallback(() => {
    setIsTrial(false)
    setPhase('playing')
  }, [])

  // Called when any puzzle variant completes with its raw result
  const handleRecallComplete = useCallback(
    async (result: ArkalonVisionResult) => {
      if (!puzzleInfo || !playerIdRef.current) return

      const metrics = {
        family: 'arkalon_vision' as const,
        rounds: result.rounds,
        totalElapsedMs: result.totalElapsedMs
      }

      setResultElapsedMs(result.totalElapsedMs)
      setRawMetrics(metrics)

      if (isTrial) {
        // Trial complete - mark trial and show trial result prompt
        const pid = playerIdRef.current
        await completeTrial(pid, category)
        setTrialsCompleted((prev) => [...prev, category])

        // Compute a client-side preview score for trial display only
        // (not submitted; server will recompute on real submission)
        const previewScore = Math.max(
          0,
          Math.round(
            result.rounds.reduce((sum, r, i) => {
              const weight = [35, 30, 35][i] ?? 30
              return sum + (r.correctGlyphs / r.sequenceLength) * weight
            }, 0)
          )
        )

        setResultScore(previewScore)
        setResultStatus(previewScore >= 15 ? 'solved' : 'failed')
        setResultMetrics({
          accuracyPercent: Math.round(
            (result.rounds.reduce((s, r) => s + r.correctGlyphs, 0) /
              result.rounds.reduce((s, r) => s + r.sequenceLength, 0)) *
              100
          ),
          maxSequence: Math.max(...result.rounds.map((r) => r.sequenceLength)),
          errors: result.rounds.reduce((s, r) => s + r.errors, 0),
          completionTimeMs: result.totalElapsedMs,
          isTrial: true
        })
        setPhase('result')
        return
      }

      // Real submission
      setPhase('submitting')
      const pid = playerIdRef.current

      const res = await submitResult({
        playerId: pid,
        category,
        puzzleFamilyId: puzzleInfo.puzzleFamilyId,
        puzzleDate: puzzleInfo.puzzleDate,
        elapsedMs: result.totalElapsedMs,
        familyMetrics: metrics
      })

      if (!res.success) {
        setErrorMsg(res.error ?? 'Submission failed')
        setPhase('error')
        return
      }

      const score = res.normalizedScore ?? 0
      const status = res.status ?? 'failed'

      // Play result sound
      if (score >= 90) play('result-legendary')
      else if (score >= 70) play('result-epic')
      else if (score >= 50) play('result-rare')
      else play('result-common')

      // TTS result line
      if (arkalonTTSEnabled) {
        if (score >= 96)
          speakArkalon('Exceptional... performance... recorded.', arkalonVolume)
        else if (score >= 90)
          speakArkalon('Precision... acknowledged.', arkalonVolume)
        else if (score >= 80)
          speakArkalon('Competent... execution... noted.', arkalonVolume)
        else if (score >= 70)
          speakArkalon('Adequate... but room... for refinement.', arkalonVolume)
        else if (score >= 50)
          speakArkalon('The data... has been... catalogued.', arkalonVolume)
        else
          speakArkalon('The challenge... proved... formidable.', arkalonVolume)
      }

      setResultScore(score)
      setResultStatus(status)
      setStreakDays(res.currentStreak ?? 0)
      setResultMetrics({
        accuracyPercent: Math.round(
          (result.rounds.reduce((s, r) => s + r.correctGlyphs, 0) /
            result.rounds.reduce((s, r) => s + r.sequenceLength, 0)) *
            100
        ),
        maxSequence: Math.max(...result.rounds.map((r) => r.sequenceLength)),
        errors: result.rounds.reduce((s, r) => s + r.errors, 0),
        completionTimeMs: result.totalElapsedMs
      })

      setPhase('result')
    },
    [puzzleInfo, isTrial, category, play, arkalonTTSEnabled, arkalonVolume]
  )

  const cat = CATEGORIES[category]

  // --- Render states ---

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="flex min-h-dvh flex-col">
        <GameHeader category={category} />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-muted">
            {phase === 'submitting' ? 'Submitting...' : 'Loading puzzle...'}
          </p>
        </main>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-dvh flex-col">
        <GameHeader category={category} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="text-sm text-status-fail">{errorMsg}</p>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-text-muted underline underline-offset-2"
          >
            Return home
          </button>
        </main>
      </div>
    )
  }

  if (phase === 'already-played') {
    return (
      <div className="flex min-h-dvh flex-col">
        <GameHeader category={category} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-sm text-text-muted">
            You&apos;ve already played {cat.displayName} today.
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg border border-border-subtle px-6 py-3 text-xs font-semibold text-text-muted transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent-recall"
          >
            Return Home
          </button>
        </main>
      </div>
    )
  }

  if (phase === 'trial-explainer') {
    return (
      <>
        <GameHeader category={category} />
        <TrialExplainer
          category={category}
          onBeginTrial={handleTrialBegin}
          onSkip={handleTrialSkip}
        />
      </>
    )
  }

  if (phase === 'result') {
    const familyDef = ArkalonVisionFamily
    const allStatuses = buildPlaceholderStatuses(
      category,
      resultStatus,
      resultScore
    )

    return (
      <div className="flex min-h-dvh flex-col">
        <GameHeader category={category} />
        <main className="flex-1 overflow-y-auto">
          {isTrial && resultMetrics.isTrial ? (
            // Trial result screen
            <div className="mx-auto flex max-w-[720px] flex-col items-center gap-6 px-4 py-8">
              <p className="text-xs uppercase tracking-widest text-[#F59E0B]">
                Trial Complete
              </p>
              <div
                className={`font-mono text-6xl font-bold ${getScoreTierClass(resultScore)}`}
              >
                {resultScore}
              </div>
              <p className="text-sm text-text-muted">
                Preview score &mdash; not recorded
              </p>
              <button
                onClick={() => {
                  setIsTrial(false)
                  setPhase('playing')
                  // Reload fresh seed data for the real attempt
                  const pid = playerIdRef.current
                  if (pid) {
                    getDailyChallenge(pid, category).then((res) => {
                      if (res.success && res.seedData) {
                        setSeedData(res.seedData)
                        setPuzzleInfo(res.puzzleInfo!)
                      }
                    })
                  }
                }}
                className="w-full max-w-xs rounded-lg px-6 py-3 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent-recall"
                style={{ backgroundColor: cat.accentColor }}
              >
                [ PLAY TODAY&apos;S PUZZLE ]
              </button>
              <button
                onClick={() => router.push('/')}
                className="text-xs text-text-muted underline underline-offset-2"
              >
                Return home
              </button>
            </div>
          ) : (
            <ResultScreen
              category={category}
              familyName={
                puzzleInfo?.puzzleFamilyId
                  ? familyDef.displayName
                  : cat.displayName
              }
              familyIndex={puzzleInfo?.familyIndex ?? 0}
              score={resultScore}
              status={resultStatus}
              elapsedMs={resultElapsedMs}
              metricDefinitions={familyDef.resultMetrics}
              metricValues={resultMetrics}
              streakDays={streakDays}
              allStatuses={allStatuses}
            />
          )}
        </main>
        <BottomNav />
      </div>
    )
  }

  // phase === 'playing'
  const visionData = seedData?.familyData as unknown as ArkalonVisionData | null
  if (!visionData) {
    return (
      <div className="flex min-h-dvh flex-col">
        <GameHeader category={category} />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-muted">Loading puzzle data...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <GameHeader
        category={category}
        familyName={ArkalonVisionFamily.displayName}
        familyIndex={puzzleInfo?.familyIndex}
      />
      <main className="mx-auto flex w-full max-w-180 flex-1 flex-col px-4 py-4">
        {category === 'recall' && (
          <ArkalonVision
            data={visionData}
            isTrial={isTrial}
            onComplete={handleRecallComplete}
          />
        )}
        {category !== 'recall' && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-text-muted">
              {cat.displayName} puzzle coming soon.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
