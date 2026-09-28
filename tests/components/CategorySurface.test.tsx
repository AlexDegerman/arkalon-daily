import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { CategorySurface } from '@/components/puzzles/CategorySurface'

const {
  mockRouter,
  mockRouterReplace,
  mockRouterPush,
  mockGetDailyChallenge,
  mockGetTrialChallenge,
  mockCompleteTrial,
  mockSubmitResult,
  mockGetCategoryStatuses,
  mockPlay,
  mockSpeakArkalon,
  mockSetContext,
  fakeRecallResult,
  fakeSurgeResult
} = vi.hoisted(() => {
  const mockRouterReplace = vi.fn()
  const mockRouterPush = vi.fn()
  const mockRouter = {
    replace: mockRouterReplace,
    push: mockRouterPush
  }
  return {
    mockRouter,
    mockRouterReplace,
    mockRouterPush,
    mockGetDailyChallenge: vi.fn(),
    mockGetTrialChallenge: vi.fn(),
    mockCompleteTrial: vi.fn(),
    mockSubmitResult: vi.fn(),
    mockGetCategoryStatuses: vi.fn(),
    mockPlay: vi.fn(),
    mockSpeakArkalon: vi.fn(),
    mockSetContext: vi.fn(),
    fakeRecallResult: {
      rounds: [
        { correctGlyphs: 3, sequenceLength: 3, elapsedMs: 2400, errors: 0 },
        { correctGlyphs: 5, sequenceLength: 5, elapsedMs: 4000, errors: 0 },
        { correctGlyphs: 7, sequenceLength: 7, elapsedMs: 5600, errors: 0 }
      ],
      totalElapsedMs: 12000
    },
    fakeSurgeResult: {
      nodes: [
        { reactionMs: 200, isDecoy: false, consecutiveHitsAtFire: 0 },
        { reactionMs: 150, isDecoy: false, consecutiveHitsAtFire: 1 }
      ],
      expectedNodeCount: 2,
      totalElapsedMs: 60000,
      avgReactionMs: 175,
      correctTaps: 2,
      misses: 0,
      bestCombo: 2
    }
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter
}))

vi.mock('@/app/actions/getDailyChallenge', () => ({
  getDailyChallenge: mockGetDailyChallenge
}))

vi.mock('@/app/actions/getTrialChallenge', () => ({
  getTrialChallenge: mockGetTrialChallenge
}))

vi.mock('@/app/actions/completeTrial', () => ({
  completeTrial: mockCompleteTrial
}))

vi.mock('@/app/actions/submitResult', () => ({
  submitResult: mockSubmitResult
}))

vi.mock('@/app/actions/getCategoryStatuses', () => ({
  getCategoryStatuses: mockGetCategoryStatuses
}))

const mockUseSound = { play: mockPlay }
vi.mock('@/hooks/useSound', () => ({
  useSound: () => mockUseSound
}))

vi.mock('@/hooks/useTabGuard', () => ({
  useTabGuard: vi.fn()
}))

vi.mock('@/lib/arkalonTTS', () => ({
  speakArkalon: mockSpeakArkalon,
  primeArkalonVoices: vi.fn(),
  unlockArkalon: vi.fn()
}))

vi.mock('@/lib/ttsLines', () => ({
  TTS_LINES: {
    categoryEntry: {
      recall: 'recall',
      surge: 'surge',
      cipher: 'cipher',
      strike: 'strike',
      depths: 'depths'
    },
    allComplete: 'all-complete',
    result: {
      mythical: 'mythical',
      legendary: 'legendary',
      epic: 'epic',
      rare: 'rare',
      common: 'common'
    }
  },
  getResultTTSLine: () => 'result'
}))

vi.mock('@/lib/displayMetrics', () => ({
  buildDisplayMetrics: () => ({})
}))

vi.mock('@/lib/puzzles/displayMetrics', () => ({
  buildDisplayMetrics: () => ({})
}))

vi.mock('@/app/stores/musicStore', () => ({
  useMusicStore: {
    getState: () => ({ setContext: mockSetContext })
  }
}))

vi.mock('@/app/stores/uiStore', () => {
  const state = { arkalonTTSEnabled: false, arkalonVolume: 0.5 }
  const useUiStore = (selector?: (s: typeof state) => unknown) =>
    selector ? selector(state) : state
  useUiStore.getState = () => state
  useUiStore.setState = () => {}
  useUiStore.subscribe = () => () => {}
  return { useUiStore }
})

vi.mock('@/components/puzzles/ArkalonVision', () => ({
  ArkalonVision: ({ onComplete }: { onComplete?: (r: unknown) => void }) => (
    <button
      data-testid="puzzle-complete"
      onClick={async () => {
        await onComplete?.(fakeRecallResult)
      }}
    >
      Finish Recall
    </button>
  )
}))

vi.mock('@/components/puzzles/SurgeFrenzy', () => ({
  SurgeFrenzy: ({ onComplete }: { onComplete?: (r: unknown) => void }) => (
    <button
      data-testid="puzzle-complete"
      onClick={async () => {
        await onComplete?.(fakeSurgeResult)
      }}
    >
      Finish Surge
    </button>
  )
}))

vi.mock('@/components/puzzles/SniperChallenge', () => ({
  SniperChallenge: () => <div data-testid="sniper-challenge" />
}))

vi.mock('@/components/puzzles/WildPrediction', () => ({
  WildPrediction: () => <div data-testid="wild-prediction" />
}))

vi.mock('@/components/puzzles/CrystalMine', () => ({
  CrystalMine: () => <div data-testid="crystal-mine" />
}))

vi.mock('@/components/layout/GameHeader', () => ({
  GameHeader: () => <div data-testid="game-header" />
}))

vi.mock('@/components/layout/BottomNav', () => ({
  BottomNav: () => <div data-testid="bottom-nav" />
}))

vi.mock('@/components/layout/PauseOverlay', () => ({
  PauseOverlay: () => null
}))

vi.mock('@/components/layout/StartCountdownOverlay', () => ({
  StartCountdownOverlay: () => null
}))

vi.mock('@/components/trial/TrialBanner', () => ({
  TrialBanner: () => null
}))

vi.mock('@/components/trial/TrialExplainer', () => ({
  TrialExplainer: (props: Record<string, unknown>) => {
    const fnProps = Object.entries(props).filter(
      ([, v]) => typeof v === 'function'
    )
    const skipEntry = fnProps.find(([k]) => /skip/i.test(k))
    const beginEntry = fnProps.find(([k]) => !/skip/i.test(k))
    return (
      <div data-testid="trial-explainer">
        <button
          data-testid="begin-trial"
          onClick={async () => {
            await (beginEntry?.[1] as () => unknown)?.()
          }}
        >
          BEGIN TRIAL
        </button>
        <button
          data-testid="skip-trial"
          onClick={async () => {
            await (skipEntry?.[1] as () => unknown)?.()
          }}
        >
          SKIP
        </button>
      </div>
    )
  }
}))

vi.mock('@/components/modals/VariationBriefingModal', () => ({
  VariationBriefingModal: () => <div data-testid="variation-briefing" />
}))

vi.mock('@/components/result/ResultScreen', () => ({
  ResultScreen: ({ score }: { score: number }) => (
    <div data-testid="result-screen">Score: {score}</div>
  )
}))

vi.mock('@/components/overlays/StreakMilestoneOverlay', () => ({
  StreakMilestoneOverlay: ({ milestone }: { milestone: number }) => (
    <div data-testid="milestone-overlay">Milestone: {milestone}</div>
  )
}))

vi.mock('@/components/profile/RecoveryTutorialOverlay', () => ({
  RecoveryTutorialOverlay: () => null
}))

const PLAYER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const PUZZLE_DATE = '2026-03-01'
const FIND_OPTS = { timeout: 3000 }

const recallPuzzleInfo = {
  puzzleDate: PUZZLE_DATE,
  category: 'recall' as const,
  puzzleFamilyId: 'arkalon_vision',
  familyIndex: 1
}

const surgePuzzleInfo = {
  puzzleDate: PUZZLE_DATE,
  category: 'surge' as const,
  puzzleFamilyId: 'surge_frenzy',
  familyIndex: 1
}

const recallSeedData = {
  profile: { displayDurationMs: 800, roundCount: 3 },
  familyData: {
    rounds: [
      { sequence: ['A', 'B', 'C'], displayDurationMs: 800 },
      { sequence: ['D', 'E', 'F', 'G', 'H'], displayDurationMs: 800 },
      { sequence: ['I', 'J', 'K', 'L', 'M', 'N', 'O'], displayDurationMs: 800 }
    ],
    glyphPool: [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O'
    ],
    randomizedLayout: false,
    reverseEntry: false
  }
}

const trialRecallSeedData = {
  profile: { displayDurationMs: 700, roundCount: 3 },
  familyData: {
    rounds: [
      { sequence: ['X', 'Y', 'Z'], displayDurationMs: 700 },
      { sequence: ['1', '2', '3', '4', '5'], displayDurationMs: 700 },
      { sequence: ['6', '7', '8', '9', '0', '!', '@'], displayDurationMs: 700 }
    ],
    glyphPool: [
      'X',
      'Y',
      'Z',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '0',
      '!',
      '@'
    ],
    randomizedLayout: false,
    reverseEntry: false
  }
}

const surgeSeedData = {
  profile: { timerSeconds: 60, expectedNodeCount: 2 },
  familyData: {
    nodes: fakeSurgeResult.nodes,
    expectedNodeCount: fakeSurgeResult.expectedNodeCount
  }
}

function setPlayerId(id: string | null) {
  if (id === null) localStorage.removeItem('arkalon_daily_player_id')
  else localStorage.setItem('arkalon_daily_player_id', id)
}

beforeEach(() => {
  vi.clearAllMocks()
  setPlayerId(PLAYER_ID)
  localStorage.setItem('arkalon_daily_recovery_tutorial_shown', 'true')

  mockPlay.mockResolvedValue(undefined)
  mockSpeakArkalon.mockResolvedValue(undefined)

  mockGetDailyChallenge.mockResolvedValue({
    success: true,
    puzzleInfo: recallPuzzleInfo,
    seedData: recallSeedData,
    trialsCompleted: ['recall'],
    streakDays: 0
  })

  mockGetTrialChallenge.mockResolvedValue({
    success: true,
    seedData: trialRecallSeedData
  })

  mockCompleteTrial.mockResolvedValue({ success: true })

  mockSubmitResult.mockResolvedValue({
    success: true,
    normalizedScore: 100,
    status: 'solved',
    currentStreak: 1,
    longestStreak: 1,
    newMilestone: null
  })

  mockGetCategoryStatuses.mockResolvedValue({
    success: true,
    statuses: []
  })
})

afterEach(() => {
  localStorage.clear()
})

describe('CategorySurface', () => {
  it('redirects home when no player ID exists', async () => {
    setPlayerId(null)
    render(<CategorySurface category="recall" />)
    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/')
    })
    expect(mockGetDailyChallenge).not.toHaveBeenCalled()
  })

  it('shows an error state when the challenge fails to load', async () => {
    mockGetDailyChallenge.mockResolvedValue({
      success: false,
      error: 'No puzzle generated for today yet. Try again shortly.'
    })
    render(<CategorySurface category="recall" />)
    expect(
      await screen.findByText(
        'No puzzle generated for today yet. Try again shortly.',
        {},
        FIND_OPTS
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Return home')).toBeInTheDocument()
  })

  it('renders the saved result screen for an already completed attempt', async () => {
    mockGetDailyChallenge.mockResolvedValue({
      success: true,
      alreadyPlayed: true,
      puzzleInfo: recallPuzzleInfo,
      seedData: recallSeedData,
      streakDays: 3,
      savedScore: 85,
      savedFamilyMetrics: {
        family: 'arkalon_vision',
        rounds: [],
        totalElapsedMs: 12000
      }
    })
    render(<CategorySurface category="recall" />)
    const result = await screen.findByTestId('result-screen', {}, FIND_OPTS)
    expect(result).toHaveTextContent('85')
  })

  it('shows the trial explainer when the trial is not yet completed', async () => {
    mockGetDailyChallenge.mockResolvedValue({
      success: true,
      puzzleInfo: recallPuzzleInfo,
      seedData: recallSeedData,
      trialsCompleted: [],
      streakDays: 0
    })
    render(<CategorySurface category="recall" />)
    expect(
      await screen.findByTestId('trial-explainer', {}, FIND_OPTS)
    ).toBeInTheDocument()
    expect(mockGetTrialChallenge).toHaveBeenCalledWith(PLAYER_ID, 'recall')
  })

  it('goes straight to playing when the trial is already completed', async () => {
    render(<CategorySurface category="recall" />)
    expect(
      await screen.findByTestId('puzzle-complete', {}, FIND_OPTS)
    ).toBeInTheDocument()
    expect(screen.queryByTestId('trial-explainer')).not.toBeInTheDocument()
    expect(mockGetTrialChallenge).not.toHaveBeenCalled()
  })

  it('completing a trial records it and shows a preview result without submitting', async () => {
    mockGetDailyChallenge.mockResolvedValue({
      success: true,
      puzzleInfo: recallPuzzleInfo,
      seedData: recallSeedData,
      trialsCompleted: [],
      streakDays: 0
    })

    render(<CategorySurface category="recall" />)

    const beginButton = await screen.findByTestId('begin-trial', {}, FIND_OPTS)
    await act(async () => {
      fireEvent.click(beginButton)
    })

    const completeButton = await screen.findByTestId(
      'puzzle-complete',
      {},
      FIND_OPTS
    )
    await act(async () => {
      fireEvent.click(completeButton)
    })

    await waitFor(() => {
      expect(mockCompleteTrial).toHaveBeenCalledWith(PLAYER_ID, 'recall')
    }, FIND_OPTS)

    expect(
      await screen.findByText(/Trial Complete/i, {}, FIND_OPTS)
    ).toBeInTheDocument()
    expect(mockSubmitResult).not.toHaveBeenCalled()
  })

  it('skipping the trial goes straight to playing', async () => {
    mockGetDailyChallenge.mockResolvedValue({
      success: true,
      puzzleInfo: recallPuzzleInfo,
      seedData: recallSeedData,
      trialsCompleted: [],
      streakDays: 0
    })

    render(<CategorySurface category="recall" />)

    const skipButton = await screen.findByTestId('skip-trial', {}, FIND_OPTS)
    await act(async () => {
      fireEvent.click(skipButton)
    })

    expect(
      await screen.findByTestId('puzzle-complete', {}, FIND_OPTS)
    ).toBeInTheDocument()
  })

  it('submits a real attempt and shows the result', async () => {
    render(<CategorySurface category="recall" />)

    const completeButton = await screen.findByTestId(
      'puzzle-complete',
      {},
      FIND_OPTS
    )
    await act(async () => {
      fireEvent.click(completeButton)
    })

    await waitFor(() => {
      expect(mockSubmitResult).toHaveBeenCalledWith({
        playerId: PLAYER_ID,
        category: 'recall',
        puzzleFamilyId: 'arkalon_vision',
        puzzleDate: PUZZLE_DATE,
        elapsedMs: 12000,
        familyMetrics: {
          family: 'arkalon_vision',
          rounds: fakeRecallResult.rounds,
          totalElapsedMs: fakeRecallResult.totalElapsedMs
        }
      })
    }, FIND_OPTS)

    const result = await screen.findByTestId('result-screen', {}, FIND_OPTS)
    expect(result).toHaveTextContent('100')
  })

  it('shows an error when submission fails', async () => {
    mockSubmitResult.mockResolvedValue({
      success: false,
      error: 'Already submitted for today'
    })

    render(<CategorySurface category="recall" />)

    const completeButton = await screen.findByTestId(
      'puzzle-complete',
      {},
      FIND_OPTS
    )
    await act(async () => {
      fireEvent.click(completeButton)
    })

    expect(
      await screen.findByText(/Already submitted for today/i, {}, FIND_OPTS)
    ).toBeInTheDocument()
  })

  it('shows the milestone overlay when a new milestone is reached', async () => {
    mockGetDailyChallenge.mockResolvedValue({
      success: true,
      puzzleInfo: recallPuzzleInfo,
      seedData: recallSeedData,
      trialsCompleted: ['recall'],
      streakDays: 6
    })

    mockSubmitResult.mockResolvedValue({
      success: true,
      normalizedScore: 100,
      status: 'solved',
      currentStreak: 7,
      longestStreak: 7,
      newMilestone: 7
    })

    render(<CategorySurface category="recall" />)

    const completeButton = await screen.findByTestId(
      'puzzle-complete',
      {},
      FIND_OPTS
    )
    await act(async () => {
      fireEvent.click(completeButton)
    })

    const overlay = await screen.findByTestId(
      'milestone-overlay',
      {},
      FIND_OPTS
    )
    expect(overlay).toHaveTextContent('7')
  })

  it('submits a surge attempt with the correct family metrics', async () => {
    mockGetDailyChallenge.mockResolvedValue({
      success: true,
      puzzleInfo: surgePuzzleInfo,
      seedData: surgeSeedData,
      trialsCompleted: ['surge'],
      streakDays: 0
    })

    mockSubmitResult.mockResolvedValue({
      success: true,
      normalizedScore: 90,
      status: 'solved',
      currentStreak: 1,
      longestStreak: 1,
      newMilestone: null
    })

    render(<CategorySurface category="surge" />)

    const completeButton = await screen.findByTestId(
      'puzzle-complete',
      {},
      FIND_OPTS
    )
    await act(async () => {
      fireEvent.click(completeButton)
    })

    await waitFor(() => {
      expect(mockSubmitResult).toHaveBeenCalledWith({
        playerId: PLAYER_ID,
        category: 'surge',
        puzzleFamilyId: 'surge_frenzy',
        puzzleDate: PUZZLE_DATE,
        elapsedMs: 60000,
        familyMetrics: {
          family: 'surge_frenzy',
          nodes: fakeSurgeResult.nodes,
          expectedNodeCount: fakeSurgeResult.expectedNodeCount,
          totalElapsedMs: fakeSurgeResult.totalElapsedMs
        }
      })
    }, FIND_OPTS)

    const result = await screen.findByTestId('result-screen', {}, FIND_OPTS)
    expect(result).toHaveTextContent('90')
  })
})
