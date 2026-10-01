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
import { getTrialChallenge } from '@/app/actions/getTrialChallenge'
import { completeTrial } from '@/app/actions/completeTrial'
import { submitResult } from '@/app/actions/submitResult'
import { usePuzzleStore } from '@/app/stores/puzzleStore'
import { useUiStore } from '@/app/stores/uiStore'
import { speakArkalon } from '@/lib/arkalonTTS'
import { useSound } from '@/hooks/useSound'
import type { SoundKey } from '@/hooks/useSound'
import { getScoreTierClass, getScoreRarity } from '@/lib/format'
import { CATEGORIES } from '@/constants/categories'
import { getCategoryStatuses } from '@/app/actions/getCategoryStatuses'
import { FAMILY_META } from '@/constants/familyMeta'
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
  PuzzleSeedData
} from '@/types/puzzle'
import { TTS_LINES, getResultTTSLine } from '@/lib/ttsLines'
import { useTabGuard } from '@/hooks/useTabGuard'
import { useMusicStore } from '@/app/stores/musicStore'
import { buildDisplayMetrics } from '@/lib/displayMetrics'

import {
  VariationBriefingModal,
  type BriefingInfo
} from '@/components/modals/VariationBriefingModal'

type SurfacePhase =
  | 'loading'
  | 'trial-explainer'
  | 'briefing'
  | 'playing'
  | 'submitting'
  | 'result'
  | 'error'

interface CategorySurfaceProps {
  category: PuzzleCategory
}

function resolveBriefing(
  category: PuzzleCategory,
  seedData?: PuzzleSeedData | null
): BriefingInfo | null {
  if (!seedData) return null
  const profile = seedData.profile ?? {}
  const familyData = (seedData.familyData ?? {}) as Record<string, unknown>

  if (category === 'depths') {
    const clueType = String(profile.clueType ?? 'numeric')
    const key = `depths:${clueType}`
    if (clueType === 'directional') {
      return {
        modifierKey: key,
        title: 'Directional',
        bullets: [
          'Goal: Tap tiles to dig all hidden crystals. Digging an empty tile wastes a charge and lowers your score.',
          'Clue arrows (→, ↘, ↓, etc.) point in the 8 compass directions toward the nearest crystal.',
          'Outer border numbers show the exact total crystals buried in each row and column.'
        ]
      }
    }
    if (clueType === 'hot_cold') {
      return {
        modifierKey: key,
        title: 'Hot & Cold',
        bullets: [
          'Goal: Tap tiles to dig all hidden crystals. Digging an empty tile wastes a charge and lowers your score.',
          'Sensor tiles show distance bands: HOT (1 step away), WARM (2–3 steps), COLD (4+ steps).',
          'Outer border numbers show the exact total crystals buried in each row and column.'
        ]
      }
    }
    if (clueType === 'adjacency_count') {
      return {
        modifierKey: key,
        title: 'Adjacency Count',
        bullets: [
          'Goal: Tap tiles to dig all hidden crystals. Digging an empty tile wastes a charge and lowers your score.',
          'Numbers indicate how many crystals exist in the 8 neighboring cells touching that tile.',
          'Outer border numbers show the exact total crystals buried in each row and column.'
        ]
      }
    }
    if (clueType === 'numeric') {
      return {
        modifierKey: key,
        title: 'Numeric Distance',
        bullets: [
          'Goal: Tap tiles to dig all hidden crystals. Digging an empty tile wastes a charge and lowers your score.',
          'Clue numbers indicate the exact step distance (|row diff| + |col diff|) to the nearest crystal.',
          'Outer border numbers show the exact total crystals buried in each row and column.'
        ]
      }
    }
  }

  if (category === 'strike') {
    const fn = String(profile.motionFunction ?? 'linear')
    const key = `strike:${fn}`
    if (fn === 'deceptive') {
      return {
        modifierKey: key,
        title: 'Deceptive',
        bullets: [
          'The reticle will decelerate and briefly reverse backwards before bursting forward through the target.',
          'Anticipate the feint and hold fire until the reticle completes its reverse.'
        ]
      }
    }
    if (fn === 'staccato') {
      return {
        modifierKey: key,
        title: 'Staccato',
        bullets: [
          'The reticle advances in rapid 250ms bursts separated by 150ms dead-stops.',
          'Time your shot as the reticle pauses or steps into the target zone.'
        ]
      }
    }
    if (fn === 'pendulum') {
      return {
        modifierKey: key,
        title: 'Pendulum',
        bullets: [
          'The reticle sweeps at peak velocity through the center and decelerates at the outer track edges.'
        ]
      }
    }
    if (fn === 'erratic') {
      return {
        modifierKey: key,
        title: 'Erratic',
        bullets: [
          'High-frequency vibration waves create micro-jitters along the reticle trajectory.'
        ]
      }
    }
  }

  if (category === 'recall') {
    const isReverse = Boolean(familyData?.reverseEntry || profile?.reverseEntry)
    const isShuffled = Boolean(
      familyData?.randomizedLayout || profile?.randomizedLayout
    )
    if (isReverse && isShuffled) {
      return {
        modifierKey: 'recall:nightmare',
        title: 'Nightmare',
        bullets: [
          'Enter the sequence in exact reverse order (last glyph seen back to first).',
          'Keypad symbols shuffle positions every round—visually scan for each glyph.'
        ]
      }
    }
    if (isReverse) {
      return {
        modifierKey: 'recall:reverse',
        title: 'Reverse',
        bullets: [
          'Enter the glyphs in reverse order (from the last symbol displayed back to the first).'
        ]
      }
    }
    if (isShuffled) {
      return {
        modifierKey: 'recall:shuffled',
        title: 'Shuffled',
        bullets: [
          'The keypad buttons shuffle positions every round to prevent muscle-memory shortcuts.'
        ]
      }
    }
  }

  if (category === 'cipher') {
    const rounds = (familyData?.rounds as Array<{ generator: string }>) ?? []
    const generators = (profile?.patternGenerators as string[]) ?? []
    const hasRuleDiscovery =
      rounds.some((r) => r?.generator === 'rule_discovery') ||
      generators.includes('rule_discovery')
    const hasConstrained =
      rounds.some((r) => r?.generator === 'constrained_choice') ||
      generators.includes('constrained_choice')
    const hasTriVariable =
      rounds.some((r) => r?.generator === 'tri_variable') ||
      generators.includes('tri_variable')
    const hasDualVariable =
      rounds.some((r) => r?.generator === 'dual_variable') ||
      generators.includes('dual_variable')

    if (hasRuleDiscovery) {
      return {
        modifierKey: 'cipher:rule_discovery',
        title: 'Rule Discovery',
        bullets: [
          'Compare the YES and NO boxes to deduce the single governing rule (shape, color, size, or warm/cool tone).',
          'Choose the one shape that satisfies the rule.'
        ]
      }
    }
    if (hasConstrained) {
      return {
        modifierKey: 'cipher:constrained_choice',
        title: 'Constrained Choice',
        bullets: [
          'Read all listed constraints. Distractor options are near-misses that break exactly one rule.',
          'Select the one shape that satisfies every constraint.'
        ]
      }
    }
    if (hasTriVariable) {
      return {
        modifierKey: 'cipher:tri_variable',
        title: 'Tri-Variable',
        bullets: [
          'Shapes, colors, and sizes cycle independently on out-of-sync loops.',
          'Isolate one attribute at a time to predict what comes next.'
        ]
      }
    }
    if (hasDualVariable) {
      return {
        modifierKey: 'cipher:dual_variable',
        title: 'Dual-Variable',
        bullets: [
          'Shapes and colors cycle on two separate alternating rhythms while size stays constant.',
          'Track both independent cycles to find the matching pair.'
        ]
      }
    }
  }

  if (category === 'surge') {
    const pattern = String(profile?.spawnPattern ?? 'single')
    const behavior = String(profile?.targetBehavior ?? 'stationary')
    const key = `surge:${pattern}:${behavior}`

    const patternDetails: Record<string, { title: string; bullets: string[] }> =
      {
        corner_seq: {
          title: 'Corner Sequence',
          bullets: [
            'Energy nodes spawn sequentially around the four screen corners.',
            'Prepare for rapid cross-screen flick jumps as targets cycle clockwise between quadrants.'
          ]
        },
        spiral: {
          title: 'Spiral',
          bullets: [
            'Nodes spawn along a rotating golden-angle vortex swirling inward toward the center.',
            'Track the orbital rotation to anticipate where each subsequent node appears.'
          ]
        },
        wave: {
          title: 'Wave',
          bullets: [
            'Nodes spawn along an oscillating horizontal sine wave across the screen.',
            'Follow the rhythmic crests and troughs as the wave sweeps.'
          ]
        },
        lane_switch: {
          title: 'Lane Switch',
          bullets: [
            'Nodes are locked to top, middle, and bottom tracks, jumping between dashed boundary rails.',
            'Shift focus vertically across the three corridor lanes.'
          ]
        },
        triple_burst: {
          title: 'Triple Burst',
          bullets: [
            'Nodes spawn in simultaneous clusters of three with extended lifetimes.',
            'Quickly prioritize and clear all three targets in the cluster before they expire.'
          ]
        },
        paired: {
          title: 'Paired',
          bullets: [
            'Nodes spawn in simultaneous bilateral mirror pairs across the center.',
            'Triage both sides of the arena in rapid succession.'
          ]
        },
        center_out: {
          title: 'Center Out',
          bullets: [
            'Nodes burst from the center outward toward the perimeter in expanding waves.',
            'Track the outward expansion to tap targets before they decay.'
          ]
        }
      }

    const supportedBehaviorHints: Record<string, string> = {
      fading: 'Target nodes fade and lose opacity over their lifetime.',
      shrinking:
        'Target nodes shrink in size over time, narrowing your tap target.',
      growing: 'Target nodes expand in size as they mature.',
      moving: 'Target nodes drift linearly across the arena.',
      brief:
        'Target nodes have shorter visibility windows—react immediately upon spawn.'
    }

    const info = patternDetails[pattern]
    if (!info) return null

    const bullets = [...info.bullets]
    if (supportedBehaviorHints[behavior]) {
      bullets.push(supportedBehaviorHints[behavior])
    }

    return {
      modifierKey: key,
      title: info.title,
      bullets
    }
  }

  return null
}

export function CategorySurface({ category }: CategorySurfaceProps) {
  const router = useRouter()
  const { play } = useSound()
  const arkalonTTSEnabled = useUiStore((s) => s.arkalonTTSEnabled)
  const arkalonVolume = useUiStore((s) => s.arkalonVolume)
  const requestPause = usePuzzleStore((s) => s.requestPause)
  const handleDuplicateTab = useCallback(() => {
    requestPause()
  }, [requestPause])
  useTabGuard(handleDuplicateTab)

  const [phase, setPhase] = useState<SurfacePhase>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isTrial, setIsTrial] = useState(false)
  const [puzzleInfo, setPuzzleInfo] = useState<DailyPuzzleInfo | null>(null)
  const [seedData, setSeedData] = useState<PuzzleSeedData | null>(null)
  const [resultScore, setResultScore] = useState<number>(0)
  const [resultMetrics, setResultMetrics] = useState<Record<string, unknown>>(
    {}
  )
  const [streakDays, setStreakDays] = useState<number>(0)
  const [allStatuses, setAllStatuses] = useState<CategoryStatus[] | null>(null)
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null)
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [recoveryTutorialShown, setRecoveryTutorialShown] = useState(true)
  const [playerName, setPlayerName] = useState<string>('Player')
  const [activeBriefing, setActiveBriefing] = useState<BriefingInfo | null>(
    null
  )
  const [isManualBriefing, setIsManualBriefing] = useState(false)

  const playerIdRef = useRef<string | null>(null)
  const dailySeedRef = useRef<PuzzleSeedData | null>(null)
  const submittingRef = useRef(false)
  const dismissedBriefingsRef = useRef<Set<string>>(new Set())

  const handleBriefingDismiss = useCallback(
    (neverShowAgain: boolean) => {
      if (activeBriefing) {
        dismissedBriefingsRef.current.add(activeBriefing.modifierKey)
        if (neverShowAgain && !isManualBriefing) {
          try {
            const rawSeen = localStorage.getItem('arkalon_seen_modifiers')
            const seenList: string[] = rawSeen ? JSON.parse(rawSeen) : []
            if (!seenList.includes(activeBriefing.modifierKey)) {
              seenList.push(activeBriefing.modifierKey)
              localStorage.setItem(
                'arkalon_seen_modifiers',
                JSON.stringify(seenList)
              )
            }
          } catch {}
        }
      }
      setActiveBriefing(null)
      setIsManualBriefing(false)
      if (arkalonTTSEnabled) {
        speakArkalon(TTS_LINES.categoryEntry[category], arkalonVolume)
      }
      setPhase('playing')
      setIsTrial(false)
    },
    [
      activeBriefing,
      isManualBriefing,
      arkalonTTSEnabled,
      arkalonVolume,
      category
    ]
  )

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

    getDailyChallenge(playerId, category)
      .then((res) => {
        if (!res.success) {
          submittingRef.current = false
          setErrorMsg(res.error ?? 'Submission failed')
          setPhase('error')
          return
        }
        // Load display name for share card
        try {
          const storedName = localStorage.getItem('arkalon_daily_display_name')
          if (storedName) setPlayerName(storedName)
        } catch {
          // localStorage unavailable
        }
        if (res.alreadyPlayed) {
          // Rebuild today's result screen from the stored attempt
          try {
            localStorage.removeItem(`arkalon_daily_${category}_session`)
          } catch {}
          setPuzzleInfo(res.puzzleInfo ?? null)
          setSeedData(res.seedData ?? null)
          setStreakDays(res.streakDays ?? 0)
          setResultScore(res.savedScore ?? 0)
          setResultMetrics(
            buildDisplayMetrics(
              category,
              res.savedFamilyMetrics ?? {},
              res.seedData?.familyData
            )
          )
          getCategoryStatuses(playerId)
            .then((statusesRes) => {
              if (statusesRes.success && statusesRes.statuses) {
                setAllStatuses(statusesRes.statuses)
              }
            })
            .catch(() => {})
          setPhase('result')
          return
        }
        setStreakDays(res.streakDays ?? 0)
        setPuzzleInfo(res.puzzleInfo!)
        setSeedData(res.seedData!)
        dailySeedRef.current = res.seedData!

        const needsTrial = !res.trialsCompleted?.includes(category)
        if (needsTrial) {
          // Load trial-specific challenge from fixed trial seed
          getTrialChallenge(playerId, category)
            .then((trialRes) => {
              if (trialRes.success && trialRes.seedData) {
                setSeedData(trialRes.seedData)
                setPhase('trial-explainer')
              } else {
                setErrorMsg(trialRes.error ?? 'Failed to load trial challenge')
                setPhase('error')
              }
            })
            .catch(() => {
              setErrorMsg('Could not load trial challenge. Please try again.')
              setPhase('error')
            })
        } else {
          // Check for unseen modifiers
          const briefing = resolveBriefing(category, res.seedData!)
          let alreadySeen = false
          if (briefing) {
            if (dismissedBriefingsRef.current.has(briefing.modifierKey)) {
              alreadySeen = true
            } else {
              try {
                const rawSeen = localStorage.getItem('arkalon_seen_modifiers')
                const seenList: string[] = rawSeen ? JSON.parse(rawSeen) : []
                alreadySeen = seenList.includes(briefing.modifierKey)
              } catch {}
            }
          }
          if (briefing && !alreadySeen) {
            setActiveBriefing(briefing)
            setPhase('briefing')
          } else {
            if (arkalonTTSEnabled) {
              speakArkalon(TTS_LINES.categoryEntry[category], arkalonVolume)
            }
            setPhase('playing')
            setIsTrial(false)
          }
        }
      })
      .catch((err) => {
        console.error('[CategorySurface] Error loading challenge:', err)
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Could not establish connection to challenge server. Please retry.'
        )
        setPhase('error')
      })
  }, [category, router, arkalonTTSEnabled, arkalonVolume])

  useEffect(() => {
    const setContext = useMusicStore.getState().setContext
    if (
      phase === 'playing' ||
      phase === 'trial-explainer' ||
      phase === 'result' ||
      phase === 'submitting'
    ) {
      setContext(category)
    } else if (phase === 'loading') {
      setContext('menu')
    }
  }, [phase, category])
  // Abandoning a puzzle mid-play must not leave puzzle music running
  useEffect(() => {
    return () => {
      useMusicStore.getState().setContext('menu')
    }
  }, [])

  const handleTrialBegin = useCallback(() => {
    setIsTrial(true)
    setPhase('playing')
    if (arkalonTTSEnabled) {
      speakArkalon(TTS_LINES.trialEntry, arkalonVolume)
    }
  }, [arkalonTTSEnabled, arkalonVolume])

  const handleTrialSkip = useCallback(() => {
    setIsTrial(false)
    if (dailySeedRef.current) {
      setSeedData(dailySeedRef.current)
    }
    setPhase('playing')
  }, [])

  // Shared submission handler used by all category completions
  const handleSubmit = useCallback(
    async (
      metrics: Parameters<typeof submitResult>[0]['familyMetrics'],
      displayMetrics: Record<string, unknown>,
      previewScore?: number
    ) => {
      if (!puzzleInfo || !playerIdRef.current || submittingRef.current) return
      submittingRef.current = true

      try {
        if (isTrial) {
          submittingRef.current = false
          const pid = playerIdRef.current
          await completeTrial(pid, category)
          const ps = previewScore ?? 50
          setResultScore(ps)
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
          submittingRef.current = false
          setErrorMsg(res.error ?? 'Submission failed')
          setPhase('error')
          return
        }

        const score = res.normalizedScore ?? 0
        // Result sting matches the rarity frame/aura on the result screen
        play(`result-${getScoreRarity(score)}` as SoundKey)

        if (arkalonTTSEnabled) {
          speakArkalon(getResultTTSLine(score), arkalonVolume)
        }

        try {
          localStorage.removeItem(`arkalon_daily_${category}_session`)
        } catch {}
        setResultScore(score)
        setStreakDays(res.currentStreak ?? 0)
        setResultMetrics(displayMetrics)
        const statusesRes = await getCategoryStatuses(pid)
        if (statusesRes.success && statusesRes.statuses) {
          setAllStatuses(statusesRes.statuses)
          if (
            arkalonTTSEnabled &&
            statusesRes.statuses.every(
              (s) => s.status === 'solved' || s.status === 'failed'
            )
          ) {
            speakArkalon(TTS_LINES.allComplete, arkalonVolume)
          }
        }
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
      } catch (err) {
        submittingRef.current = false
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Submission failed. Please check your connection and retry.'
        )
        setPhase('error')
      }
    },
    [puzzleInfo, isTrial, category, play, arkalonTTSEnabled, arkalonVolume]
  )

  // Per-family completion handlers
  const handleRecallComplete = useCallback(
    (result: ArkalonVisionResult) => {
      const raw = {
        rounds: result.rounds,
        totalElapsedMs: result.totalElapsedMs
      }
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
        buildDisplayMetrics('recall', raw),
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
        buildDisplayMetrics('surge', {
          nodes: result.nodes,
          expectedNodeCount: result.expectedNodeCount,
          totalElapsedMs: result.totalElapsedMs
        }),
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
        buildDisplayMetrics('strike', {
          shots: result.shots,
          totalElapsedMs: result.totalElapsedMs
        }),
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
          avgResponseMs: result.avgResponseMs,
          totalElapsedMs: result.totalElapsedMs
        },
        buildDisplayMetrics('cipher', {
          correctRounds: result.correctRounds,
          totalRounds: result.totalRounds,
          totalIncorrectGuesses: result.totalIncorrectGuesses,
          avgResponseMs: result.avgResponseMs,
          totalElapsedMs: result.totalElapsedMs
        }),
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
        buildDisplayMetrics(
          'depths',
          {
            depositsFound: result.depositsFound,
            totalDeposits: result.totalDeposits,
            chargesUsed: result.chargesUsed,
            chargeLimit: result.chargeLimit,
            totalElapsedMs: result.totalElapsedMs
          },
          seedData?.familyData
        ),
        Math.round((result.depositsFound / result.totalDeposits) * 80)
      )
    },
    [handleSubmit, seedData]
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
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-sm font-mono text-status-fail max-w-md">
            {errorMsg}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setPhase('loading')
                window.location.reload()
              }}
              className="rounded-lg border border-border-subtle bg-surface-panel px-4 py-2 text-xs font-mono font-bold text-text-primary hover:border-accent-recall transition-colors"
            >
              [ RETRY ]
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-xs text-text-muted underline underline-offset-2 hover:text-text-primary"
            >
              Return home
            </button>
          </div>
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

  if (phase === 'briefing' && activeBriefing) {
    return (
      <>
        <GameHeader category={category} />
        <VariationBriefingModal
          category={category}
          briefing={activeBriefing}
          isManual={isManualBriefing}
          onDismiss={handleBriefingDismiss}
        />
      </>
    )
  }

  if (phase === 'result') {
    const familyMeta = FAMILY_META[category]
    return (
      <div className="flex min-h-dvh flex-col">
        <GameHeader />
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
                Preview score &middot; not recorded
              </p>
              <button
                onClick={() => {
                  submittingRef.current = false
                  setIsTrial(false)
                  setPhase('loading')
                  // Reload fresh seed data for the real attempt
                  const pid = playerIdRef.current
                  if (pid) {
                    getDailyChallenge(pid, category)
                      .then((res) => {
                        if (res.success && res.seedData && res.puzzleInfo) {
                          setSeedData(res.seedData)
                          setPuzzleInfo(res.puzzleInfo)
                          dailySeedRef.current = res.seedData

                          const briefing = resolveBriefing(
                            category,
                            res.seedData
                          )
                          let alreadySeen = false
                          if (briefing) {
                            if (
                              dismissedBriefingsRef.current.has(
                                briefing.modifierKey
                              )
                            ) {
                              alreadySeen = true
                            } else {
                              try {
                                const rawSeen = localStorage.getItem(
                                  'arkalon_seen_modifiers'
                                )
                                const seenList: string[] = rawSeen
                                  ? JSON.parse(rawSeen)
                                  : []
                                alreadySeen = seenList.includes(
                                  briefing.modifierKey
                                )
                              } catch {}
                            }
                          }

                          if (briefing && !alreadySeen) {
                            setActiveBriefing(briefing)
                            setPhase('briefing')
                          } else {
                            if (arkalonTTSEnabled) {
                              speakArkalon(
                                TTS_LINES.categoryEntry[category],
                                arkalonVolume
                              )
                            }
                            setPhase('playing')
                          }
                        } else {
                          setErrorMsg(res.error ?? 'Failed to load challenge')
                          setPhase('error')
                        }
                      })
                      .catch((err) => {
                        setErrorMsg(
                          err instanceof Error
                            ? err.message
                            : 'Failed to load challenge. Please retry.'
                        )
                        setPhase('error')
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
              familyIndex={puzzleInfo?.familyIndex ?? 0}
              score={resultScore}
              metricDefinitions={familyMeta.resultMetrics}
              metricValues={resultMetrics}
              streakDays={streakDays}
              allStatuses={allStatuses ?? []}
            />
          )}
        </main>
        <BottomNav forceVisible />
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

  const currentBriefing = seedData ? resolveBriefing(category, seedData) : null

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <GameHeader
        category={category}
        familyIndex={puzzleInfo?.familyIndex}
        onOpenBriefing={
          currentBriefing
            ? () => {
                setIsManualBriefing(true)
                setActiveBriefing(currentBriefing)
                setPhase('briefing')
              }
            : undefined
        }
      />
      <main className="mx-auto flex w-full max-w-180 flex-1 flex-col px-2.5 sm:px-4 py-1.5 sm:py-4">
        {renderPuzzle()}
      </main>
    </div>
  )
}
