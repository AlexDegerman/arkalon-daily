'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GameHeader } from '@/components/layout/GameHeader'
import { BottomNav } from '@/components/layout/BottomNav'
import { TrialExplainer } from '@/components/trial/TrialExplainer'
import { ResultScreen } from '@/components/result/ResultScreen'
import { StreakMilestoneOverlay } from '@/components/overlays/StreakMilestoneOverlay'
import { ArkalonVision } from './ArkalonVision'
import { SurgeFrenzy } from './SurgeFrenzy'
import { SniperChallenge } from './SniperChallenge'
import { WildPrediction } from './WildPrediction'
import { CrystalMine } from './CrystalMine'
import { getDailyChallenge } from '@/app/actions/getDailyChallenge'
import { completeTrial } from '@/app/actions/completeTrial'
import { submitResult } from '@/app/actions/submitResult'
import { usePuzzleStore } from '@/app/stores/puzzleStore'
import { useUiStore } from '@/app/stores/uiStore'
import { speakArkalon } from '@/lib/arkalonTTS'
import { getResultTTSLine, TTS_LINES } from '@/lib/ttsLines'
import { useSound } from '@/hooks/useSound'
import { getScoreTierClass } from '@/lib/format'
import { CATEGORIES, CATEGORY_ORDER } from '@/constants/categories'
import { ArkalonVisionFamily } from '@/lib/puzzles/families/arkalonVision'
import { SurgeFrenzyFamily } from '@/lib/puzzles/families/surgeFrenzy'
import { SniperChallengeFamily } from '@/lib/puzzles/families/sniperChallenge'
import { WildPredictionFamily } from '@/lib/puzzles/families/wildPrediction'
import { CrystalMineFamily } from '@/lib/puzzles/families/crystalMine'
import type { ArkalonVisionData } from '@/lib/puzzles/families/arkalonVision'
import type { SurgeFrenzyData } from '@/lib/puzzles/families/surgeFrenzy'
import type { SniperChallengeData } from '@/lib/puzzles/families/sniperChallenge'
import type { WildPredictionData } from '@/lib/puzzles/families/wildPrediction'
import type { CrystalMineData } from '@/lib/puzzles/families/crystalMine'
import type { ArkalonVisionResult } from './ArkalonVision'
import type { SurgeFrenzyResult } from './SurgeFrenzy'
import type { SniperChallengeResult } from './SniperChallenge'
import type { WildPredictionResult } from './WildPrediction'
import type { CrystalMineResult } from './CrystalMine'
import type {
  PuzzleCategory,
  CategoryStatus,
  DailyPuzzleInfo,
  PuzzleSeedData,
  PuzzleFamilyDefinition
} from '@/types/puzzle'

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
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null)
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [recoveryTutorialShown, setRecoveryTutorialShown] = useState(true)
  const [playerName, setPlayerName] = useState<string>('Player')

  // Resolve family definition from category
  const familyDefForCategory = useCallback((): PuzzleFamilyDefinition => {
    switch (category) {
      case 'recall':
        return ArkalonVisionFamily
      case 'surge':
        return SurgeFrenzyFamily
      case 'strike':
        return SniperChallengeFamily
      case 'cipher':
        return WildPredictionFamily
      case 'depths':
        return CrystalMineFamily
    }
  }, [category])

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

    try {
      const tutorialShown = localStorage.getItem(
        'arkalon_daily_recovery_tutorial_shown'
      )
      setRecoveryTutorialShown(tutorialShown === 'true')
    } catch {
      setRecoveryTutorialShown(true)
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
      // Load display name for share card
      try {
        const storedName = localStorage.getItem('arkalon_daily_display_name')
        if (storedName) setPlayerName(storedName)
      } catch {
        // localStorage unavailable
      }
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
    if (arkalonTTSEnabled) {
      speakArkalon(TTS_LINES.trialEntry, arkalonVolume)
    }
  }, [arkalonTTSEnabled, arkalonVolume])

  const handleTrialSkip = useCallback(() => {
    setIsTrial(false)
    setPhase('playing')
  }, [])

  /// Shared submission handler used by all category completions
  const handleSubmit = useCallback(
    async (
      metrics: Parameters<typeof submitResult>[0]['familyMetrics'],
      displayMetrics: Record<string, unknown>,
      previewScore?: number
    ) => {
      if (!puzzleInfo || !playerIdRef.current) return

      setResultElapsedMs(metrics.totalElapsedMs)

      if (isTrial) {
        const pid = playerIdRef.current
        await completeTrial(pid, category)
        setTrialsCompleted((prev) => [...prev, category])
        const ps = previewScore ?? 50
        setResultScore(ps)
        setResultStatus(ps >= 15 ? 'solved' : 'failed')
        setResultMetrics({ ...displayMetrics, isTrial: true })
        setPhase('result')
        return
      }

      setPhase('submitting')
      const pid = playerIdRef.current
      const res = await submitResult({
        playerId: pid,
        category,
        puzzleFamilyId: puzzleInfo.puzzleFamilyId,
        puzzleDate: puzzleInfo.puzzleDate,
        elapsedMs: metrics.totalElapsedMs,
        familyMetrics: metrics
      })

      if (!res.success) {
        setErrorMsg(res.error ?? 'Submission failed')
        setPhase('error')
        return
      }

      const score = res.normalizedScore ?? 0
      const status = res.status ?? 'failed'

      if (score >= 90) play('result-legendary')
      else if (score >= 70) play('result-epic')
      else if (score >= 50) play('result-rare')
      else play('result-common')

      if (arkalonTTSEnabled) {
        speakArkalon(getResultTTSLine(score), arkalonVolume)
      }

      setResultScore(score)
      setResultStatus(status)
      setStreakDays(res.currentStreak ?? 0)
      setResultMetrics(displayMetrics)

      // Surface milestone overlay if a new milestone was reached
      if (res.newMilestone) {
        setPendingMilestone(res.newMilestone)
        // Show recovery prompt on first milestone if tutorial not yet seen
        if (!recoveryTutorialShown) {
          setShowRecoveryPrompt(true)
        }
      }

      setPhase('result')
    },
    [puzzleInfo, isTrial, category, play, arkalonTTSEnabled, arkalonVolume]
  )

  // Per-family completion handlers

  const handleRecallComplete = useCallback(
    (result: ArkalonVisionResult) => {
      const total = result.rounds.reduce((s, r) => s + r.sequenceLength, 0)
      const correct = result.rounds.reduce((s, r) => s + r.correctGlyphs, 0)
      const preview = Math.max(
        0,
        Math.round(
          result.rounds.reduce((sum, r, i) => {
            const w = [35, 30, 35][i] ?? 30
            return sum + (r.correctGlyphs / r.sequenceLength) * w
          }, 0)
        )
      )
      handleSubmit(
        {
          family: 'arkalon_vision',
          rounds: result.rounds,
          totalElapsedMs: result.totalElapsedMs
        },
        {
          accuracyPercent: total > 0 ? Math.round((correct / total) * 100) : 0,
          maxSequence: Math.max(...result.rounds.map((r) => r.sequenceLength)),
          errors: result.rounds.reduce((s, r) => s + r.errors, 0),
          completionTimeMs: result.totalElapsedMs
        },
        preview
      )
    },
    [handleSubmit]
  )

  const handleSurgeComplete = useCallback(
    (result: SurgeFrenzyResult) => {
      handleSubmit(
        {
          family: 'surge_frenzy',
          nodes: result.nodes,
          expectedNodeCount: result.expectedNodeCount,
          totalElapsedMs: result.totalElapsedMs
        },
        {
          avgReactionMs: result.avgReactionMs,
          correctTaps: result.correctTaps,
          misses: result.misses,
          bestCombo: result.bestCombo
        },
        Math.round(
          (result.correctTaps / Math.max(1, result.expectedNodeCount)) * 100
        )
      )
    },
    [handleSubmit]
  )

  const handleStrikeComplete = useCallback(
    (result: SniperChallengeResult) => {
      handleSubmit(
        {
          family: 'sniper_challenge',
          shots: result.shots,
          totalElapsedMs: result.totalElapsedMs
        },
        {
          perfectHits: result.perfectHits,
          excellentHits: result.excellentHits,
          accuracyPct: result.accuracyPct,
          avgDeviation: result.avgDeviation,
          totalShots: result.totalShots
        },
        result.accuracyPct
      )
    },
    [handleSubmit]
  )

  const handleCipherComplete = useCallback(
    (result: WildPredictionResult) => {
      handleSubmit(
        {
          family: 'wild_prediction',
          correctRounds: result.correctRounds,
          totalRounds: result.totalRounds,
          totalIncorrectGuesses: result.totalIncorrectGuesses,
          totalElapsedMs: result.totalElapsedMs
        },
        {
          correctPct: Math.round(
            (result.correctRounds / result.totalRounds) * 100
          ),
          roundsCompleted: result.roundsCompleted,
          avgResponseMs: result.avgResponseMs,
          totalErrors: result.totalIncorrectGuesses
        },
        Math.round((result.correctRounds / result.totalRounds) * 80)
      )
    },
    [handleSubmit]
  )

  const handleDepthsComplete = useCallback(
    (result: CrystalMineResult) => {
      handleSubmit(
        {
          family: 'crystal_mine',
          depositsFound: result.depositsFound,
          totalDeposits: result.totalDeposits,
          chargesUsed: result.chargesUsed,
          chargeLimit: result.chargeLimit,
          totalElapsedMs: result.totalElapsedMs
        },
        {
          depositsFound: result.depositsFound,
          chargesUsed: result.chargesUsed,
          efficiencyPct: result.efficiencyPct,
          completionTimeMs: result.totalElapsedMs
        },
        Math.round((result.depositsFound / result.totalDeposits) * 80)
      )
    },
    [handleSubmit]
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
    const familyDef = familyDefForCategory()
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
            <div className="mx-auto flex max-w-180 flex-col items-center gap-6 px-4 py-8">
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
              playerName={playerName}
              familyName={familyDef.displayName}
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
        {pendingMilestone !== null && phase === 'result' && (
          <StreakMilestoneOverlay
            category={category}
            milestone={pendingMilestone}
            streakDays={streakDays}
            onDismiss={() => setPendingMilestone(null)}
            showRecoveryPrompt={showRecoveryPrompt}
          />
        )}
      </div>
    )
  }

  // phase === 'playing'
  if (!seedData) {
    return (
      <div className="flex min-h-dvh flex-col">
        <GameHeader category={category} />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-muted">Loading puzzle data...</p>
        </main>
      </div>
    )
  }

  const activeFamilyDef = familyDefForCategory()

  function renderPuzzle() {
    if (!seedData) return null
    switch (category) {
      case 'recall':
        return (
          <ArkalonVision
            data={seedData.familyData as unknown as ArkalonVisionData}
            isTrial={isTrial}
            onComplete={handleRecallComplete}
          />
        )
      case 'surge':
        return (
          <SurgeFrenzy
            data={seedData.familyData as unknown as SurgeFrenzyData}
            isTrial={isTrial}
            onComplete={handleSurgeComplete}
          />
        )
      case 'strike':
        return (
          <SniperChallenge
            data={seedData.familyData as unknown as SniperChallengeData}
            isTrial={isTrial}
            onComplete={handleStrikeComplete}
          />
        )
      case 'cipher':
        return (
          <WildPrediction
            data={seedData.familyData as unknown as WildPredictionData}
            isTrial={isTrial}
            onComplete={handleCipherComplete}
          />
        )
      case 'depths':
        return (
          <CrystalMine
            data={seedData.familyData as unknown as CrystalMineData}
            isTrial={isTrial}
            onComplete={handleDepthsComplete}
          />
        )
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <GameHeader
        category={category}
        familyName={activeFamilyDef.displayName}
        familyIndex={puzzleInfo?.familyIndex}
      />
      <main className="mx-auto flex w-full max-w-180 flex-1 flex-col px-4 py-4">
        {renderPuzzle()}
      </main>
    </div>
  )
}
