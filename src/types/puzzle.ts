export type PuzzleCategory = 'recall' | 'surge' | 'cipher' | 'strike' | 'depths'

export type PuzzleStatus = 'available' | 'trial' | 'solved' | 'failed'

export type ScoringModel = 'speed-first' | 'logic-first' | 'continuous'

export type SpawnPatternId =
  | 'single'
  | 'alternating'
  | 'h_sweep'
  | 'v_sweep'
  | 'diagonal'
  | 'zigzag'
  | 'scatter'
  | 'circular'
  | 'expanding'
  | 'contracting'
  | 'corner_seq'
  | 'center_out'
  | 'outside_in'
  | 'paired'
  | 'triple_burst'
  | 'cross'
  | 'wave'
  | 'spiral'
  | 'lane_switch'

export type TargetBehaviorId =
  | 'stationary'
  | 'moving'
  | 'accelerating'
  | 'decelerating'
  | 'direction_change'
  | 'brief'
  | 'growing'
  | 'shrinking'
  | 'fading'
  | 'splitting'

export type TimingProfileId =
  | 'ramp'
  | 'sudden_spike'
  | 'wave'
  | 'endurance'
  | 'pressure'
  | 'mixed'
  | 'slow_short'
  | 'fast_long'

export type SpatialLayoutId =
  | 'lr_lanes'
  | 'tb_lanes'
  | 'corners'
  | 'center'
  | 'circular_perimeter'
  | 'grid'
  | 'random'
  | 'symmetrical'
  | 'asymmetrical'
  | 'narrow_corridor'

export type MotionFunctionId = 'linear' | 'sinusoidal' | 'erratic' | 'deceptive'

export type PatternGeneratorId =
  | 'alternating'
  | 'rotation_mirror'
  | 'dual_variable'
  | 'tri_variable'
  | 'rule_discovery'
  | 'grid_transform'
  | 'constrained_choice'

export type ClueTypeId =
  | 'numeric'
  | 'directional'
  | 'hot_cold'
  | 'adjacency_count'

export interface ChallengeProfile {
  sequenceLength?: number
  displayDurationMs?: number
  glyphPool?: number
  gridSize?: number
  chargeLimit?: number
  timerSeconds?: number | null
  choiceCount?: number
  targetWindowPx?: number
  movementSpeed?: number
  motionFunction?: MotionFunctionId
  spawnPattern?: SpawnPatternId
  targetBehavior?: TargetBehaviorId
  timingProfile?: TimingProfileId
  spatialLayout?: SpatialLayoutId
  clueType?: ClueTypeId
  depositPattern?: number
  patternGenerators?: PatternGeneratorId[]
  roundCount?: number
  hasDecoyTargets?: boolean
  reverseEntry?: boolean
  randomizedLayout?: boolean
  shotCount?: number
}

export interface ResultMetricDefinition {
  key: string
  label: string
  format: 'percent' | 'integer' | 'time' | 'string'
}

export interface PuzzleSeedData {
  profile: ChallengeProfile
  familyData: Record<string, unknown>
}

export interface PuzzleFamilyDefinition {
  id: string
  displayName: string
  category: PuzzleCategory
  generate: (seed: string) => PuzzleSeedData
  resultMetrics: ResultMetricDefinition[]
  scoringModel: ScoringModel
}

export interface DailyPuzzleInfo {
  puzzleDate: string
  category: PuzzleCategory
  puzzleFamilyId: string
  familyIndex: number
}

export interface CategoryStatus {
  category: PuzzleCategory
  status: PuzzleStatus
  score?: number
  streakDays: number
  trialCompleted: boolean
  yesterdayScore?: number
}

export interface PlayerProfile {
  id: string
  displayName: string | null
  createdAt: string
  trialsCompleted: string[]
  recoveryTutorialShown: boolean
}

export interface CategoryStats {
  category: PuzzleCategory
  bestScore: number
  averageScore: number
  daysPlayed: number
  currentStreak: number
  longestStreak: number
  globalPercentile: number | null
  todayResult?: {
    score: number
    status: 'solved' | 'failed'
  } | null
}

export interface ShareResult {
  type: PuzzleCategory | 'all-complete'
  category: PuzzleCategory
  familyIndex: number
  score: number
  metrics: Record<string, unknown>
  streakDays: number
  playerName: string
  url: string
}
