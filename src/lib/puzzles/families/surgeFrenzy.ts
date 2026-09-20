import 'server-only'

import {
  seedToRng,
  nextInt,
  nextFloat,
  pickOne
} from '@/lib/puzzles/seededRandom'
import { SURGE_BASE_CONFIGS } from '@/lib/puzzles/baseConfigs/surge'
import {
  SURGE_PLAY_WIDTH,
  SURGE_PLAY_HEIGHT,
  SURGE_BASE_NODE_LIFETIME_MS,
  SURGE_BASE_SPAWN_INTERVAL_MS,
  SURGE_SESSION_DURATION_MS,
  getSessionDurationMs,
  calcSpawnInterval
} from '@/lib/puzzles/compositionSystem'
import { registerValidator } from '@/lib/puzzles/validateChallenge'
import type {
  PuzzleFamilyDefinition,
  PuzzleSeedData,
  ResultMetricDefinition
} from '@/types/puzzle'
import type {
  SpawnPatternId,
  TargetBehaviorId,
  TimingProfileId,
  SpatialLayoutId
} from '@/types/puzzle'

export interface SurgeNode {
  id: number
  x: number // logical px, 0-600
  y: number // logical px, 0-400
  spawnAtMs: number // ms from session start
  lifetimeMs: number
  isDecoy: boolean
  behavior: TargetBehaviorId
  initialRadius: number // px
}

export interface SurgeFrenzyData {
  nodes: SurgeNode[]
  spawnPattern: SpawnPatternId
  targetBehavior: TargetBehaviorId
  timingProfile: TimingProfileId
  spatialLayout: SpatialLayoutId
  hasDecoyTargets: boolean
  sessionDurationMs: number
  expectedNodeCount: number
}

// Pre-generates the full spawn sequence from the seed so every player sees
// identical node positions and timings.
function generateSpawnSequence(
  rng: () => number,
  pattern: SpawnPatternId,
  timingProfile: TimingProfileId,
  behavior: TargetBehaviorId,
  hasDecoys: boolean,
  sessionDurationMs: number
): SurgeNode[] {
  const nodes: SurgeNode[] = []
  let id = 0
  let tMs = 0
  let spawnStep = 0

  // Angle accumulator for spiral pattern
  const GOLDEN_ANGLE = 137.5 * (Math.PI / 180)
  let spiralAngle = 0
  let spiralR = 30

  // Lane tracker for lane_switch
  let lastLane = -1

  while (tMs < sessionDurationMs) {
    const interval = calcSpawnInterval(timingProfile, tMs, rng())
    const lifetimeMs = Math.round(
      SURGE_BASE_NODE_LIFETIME_MS * nextFloat(rng, 0.85, 1.15)
    )

    // Determine positions based on pattern
    const positions: { x: number; y: number }[] = []

    switch (pattern) {
      case 'single': {
        positions.push({
          x: nextFloat(rng, 40, SURGE_PLAY_WIDTH - 40),
          y: nextFloat(rng, 40, SURGE_PLAY_HEIGHT - 40)
        })
        break
      }
      case 'alternating': {
        const isLeft = spawnStep % 2 === 0
        positions.push({
          x: isLeft
            ? nextFloat(rng, 40, SURGE_PLAY_WIDTH / 2 - 20)
            : nextFloat(rng, SURGE_PLAY_WIDTH / 2 + 20, SURGE_PLAY_WIDTH - 40),
          y: nextFloat(rng, 40, SURGE_PLAY_HEIGHT - 40)
        })
        break
      }
      case 'h_sweep': {
        const col = spawnStep % 10
        positions.push({
          x: col * 60 + 30,
          y: nextFloat(rng, 40, SURGE_PLAY_HEIGHT - 40)
        })
        break
      }
      case 'v_sweep': {
        const row = spawnStep % 10
        positions.push({
          x: nextFloat(rng, 40, SURGE_PLAY_WIDTH - 40),
          y: row * 40 + 20
        })
        break
      }
      case 'diagonal': {
        const offset = (spawnStep % 5) * 40 - 80
        const baseX = nextFloat(rng, 40, SURGE_PLAY_WIDTH - 40)
        positions.push({
          x: baseX,
          y: Math.min(
            SURGE_PLAY_HEIGHT - 40,
            Math.max(40, (400 / 600) * baseX + offset)
          )
        })
        break
      }
      case 'zigzag': {
        positions.push({
          x: Math.min(SURGE_PLAY_WIDTH - 40, (spawnStep % 10) * 60 + 30),
          y: spawnStep % 2 === 0 ? 100 : 300
        })
        break
      }
      case 'scatter': {
        positions.push({
          x: nextFloat(rng, 40, SURGE_PLAY_WIDTH - 40),
          y: nextFloat(rng, 40, SURGE_PLAY_HEIGHT - 40)
        })
        break
      }
      case 'circular': {
        const angle = (spawnStep % 12) * ((2 * Math.PI) / 12)
        positions.push({
          x: 300 + 150 * Math.cos(angle),
          y: 200 + 150 * Math.sin(angle)
        })
        break
      }
      case 'expanding': {
        const expAngle = nextFloat(rng, 0, 2 * Math.PI)
        const expR = Math.min(180, spawnStep * 30)
        positions.push({
          x: 300 + expR * Math.cos(expAngle),
          y: 200 + expR * Math.sin(expAngle)
        })
        break
      }
      case 'contracting': {
        const conAngle = nextFloat(rng, 0, 2 * Math.PI)
        const conR = Math.max(20, 180 - spawnStep * 30)
        positions.push({
          x: 300 + conR * Math.cos(conAngle),
          y: 200 + conR * Math.sin(conAngle)
        })
        break
      }
      case 'corner_seq': {
        const corners = [
          [50, 50],
          [550, 50],
          [550, 350],
          [50, 350]
        ] as const
        const corner = corners[spawnStep % 4]
        positions.push({
          x: corner[0] + nextFloat(rng, -30, 30),
          y: corner[1] + nextFloat(rng, -30, 30)
        })
        break
      }
      case 'center_out': {
        const dirs = [
          [0, -100],
          [100, 0],
          [0, 100],
          [-100, 0]
        ] as const
        const d = dirs[spawnStep % 4]
        for (let k = 0; k < 4; k++) {
          const kd = dirs[k]
          positions.push({ x: 300 + kd[0], y: 200 + kd[1] })
        }
        break
      }
      case 'outside_in': {
        const ringR = Math.max(30, 180 - Math.floor(spawnStep / 4) * 50)
        for (let k = 0; k < 4; k++) {
          const ang = (k / 4) * 2 * Math.PI
          positions.push({
            x: 300 + ringR * Math.cos(ang),
            y: 200 + ringR * Math.sin(ang)
          })
        }
        break
      }
      case 'paired': {
        const px = nextFloat(rng, 80, SURGE_PLAY_WIDTH - 80)
        const py = nextFloat(rng, 60, SURGE_PLAY_HEIGHT - 60)
        positions.push({ x: px, y: py })
        positions.push({ x: SURGE_PLAY_WIDTH - px, y: SURGE_PLAY_HEIGHT - py })
        break
      }
      case 'triple_burst': {
        const cx = nextFloat(rng, 80, SURGE_PLAY_WIDTH - 80)
        const cy = nextFloat(rng, 60, SURGE_PLAY_HEIGHT - 60)
        for (let k = 0; k < 3; k++) {
          const ang = (k / 3) * 2 * Math.PI
          positions.push({
            x: cx + 60 * Math.cos(ang),
            y: cy + 60 * Math.sin(ang)
          })
        }
        break
      }
      case 'cross': {
        const offsets = [
          [0, 0],
          [0, -100],
          [100, 0],
          [0, 100],
          [-100, 0]
        ] as const
        offsets.forEach((o) => positions.push({ x: 300 + o[0], y: 200 + o[1] }))
        break
      }
      case 'wave': {
        const wx = (spawnStep % 10) * 60 + 30
        positions.push({ x: wx, y: 200 + 120 * Math.sin((wx * Math.PI) / 300) })
        break
      }
      case 'spiral': {
        positions.push({
          x: Math.min(
            SURGE_PLAY_WIDTH - 40,
            Math.max(40, 300 + spiralR * Math.cos(spiralAngle))
          ),
          y: Math.min(
            SURGE_PLAY_HEIGHT - 40,
            Math.max(40, 200 + spiralR * Math.sin(spiralAngle))
          )
        })
        spiralAngle += GOLDEN_ANGLE
        spiralR += 20
        if (spiralR > 170) {
          spiralR = 30
          spiralAngle = 0
        }
        break
      }
      case 'lane_switch': {
        const lanes = [0, 1, 2].filter((l) => l !== lastLane)
        const lane = lanes[nextInt(rng, lanes.length)]
        lastLane = lane
        positions.push({
          x: nextFloat(rng, 40, SURGE_PLAY_WIDTH - 40),
          y: [100, 200, 300][lane]
        })
        break
      }
    }

    // Clamp positions to play area
    const clamped = positions.map((p) => ({
      x: Math.min(SURGE_PLAY_WIDTH - 40, Math.max(40, p.x)),
      y: Math.min(SURGE_PLAY_HEIGHT - 40, Math.max(40, p.y))
    }))

    // Create nodes - occasional decoy injection when hasDecoys enabled
    clamped.forEach((pos, posIdx) => {
      const isDecoy = hasDecoys && posIdx === 0 && rng() < 0.18
      nodes.push({
        id: id++,
        x: pos.x,
        y: pos.y,
        spawnAtMs: tMs,
        lifetimeMs,
        isDecoy,
        behavior,
        initialRadius: 24
      })
    })

    tMs += interval
    spawnStep++
  }

  return nodes
}

function generate(seed: string): PuzzleSeedData {
  const rng = seedToRng(seed)

  const base = SURGE_BASE_CONFIGS[nextInt(rng, SURGE_BASE_CONFIGS.length)]

  const sessionDurationMs = getSessionDurationMs(base.timingProfile)
  const nodes = generateSpawnSequence(
    rng,
    base.spawnPattern,
    base.timingProfile,
    base.targetBehavior,
    base.hasDecoyTargets,
    sessionDurationMs
  )

  const expectedNodeCount = nodes.filter((n) => !n.isDecoy).length

  const familyData: SurgeFrenzyData = {
    nodes,
    spawnPattern: base.spawnPattern,
    targetBehavior: base.targetBehavior,
    timingProfile: base.timingProfile,
    spatialLayout: base.spatialLayout,
    hasDecoyTargets: base.hasDecoyTargets,
    sessionDurationMs,
    expectedNodeCount
  }

  return {
    profile: {
      spawnPattern: base.spawnPattern,
      targetBehavior: base.targetBehavior,
      timingProfile: base.timingProfile,
      spatialLayout: base.spatialLayout,
      hasDecoyTargets: base.hasDecoyTargets
    },
    familyData: familyData as unknown as Record<string, unknown>
  }
}

const RESULT_METRICS: ResultMetricDefinition[] = [
  { key: 'avgReactionMs', label: 'Avg Reaction', format: 'integer' },
  { key: 'correctTaps', label: 'Correct Taps', format: 'integer' },
  { key: 'misses', label: 'Misses', format: 'integer' },
  { key: 'bestCombo', label: 'Best Combo', format: 'integer' }
]

export const SurgeFrenzyFamily: PuzzleFamilyDefinition = {
  id: 'surge_frenzy',
  displayName: 'Surge Frenzy',
  category: 'surge',
  generate,
  resultMetrics: RESULT_METRICS,
  scoringModel: 'speed-first'
}

registerValidator('surge_frenzy', (data) => {
  const fam = data.familyData as unknown as SurgeFrenzyData
  if (fam.nodes.length < 5) {
    return { valid: false, reason: 'Too few nodes generated' }
  }
  if (fam.expectedNodeCount < 3) {
    return { valid: false, reason: 'Too few non-decoy nodes' }
  }
  return { valid: true }
})
