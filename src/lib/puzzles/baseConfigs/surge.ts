import 'server-only'

import type {
  SpawnPatternId,
  TargetBehaviorId,
  TimingProfileId,
  SpatialLayoutId
} from '@/types/puzzle'

export interface SurgeBaseConfig {
  spawnPattern: SpawnPatternId
  targetBehavior: TargetBehaviorId
  timingProfile: TimingProfileId
  spatialLayout: SpatialLayoutId
  hasDecoyTargets: boolean
}

export const SURGE_BASE_CONFIGS: SurgeBaseConfig[] = [
  {
    spawnPattern: 'spiral',
    targetBehavior: 'fading',
    timingProfile: 'ramp',
    spatialLayout: 'circular_perimeter',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'wave',
    targetBehavior: 'stationary',
    timingProfile: 'ramp',
    spatialLayout: 'random',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'lane_switch',
    targetBehavior: 'stationary',
    timingProfile: 'ramp',
    spatialLayout: 'tb_lanes',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'corner_seq',
    targetBehavior: 'stationary',
    timingProfile: 'mixed',
    spatialLayout: 'corners',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'triple_burst',
    targetBehavior: 'stationary',
    timingProfile: 'pressure',
    spatialLayout: 'grid',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'paired',
    targetBehavior: 'moving',
    timingProfile: 'wave',
    spatialLayout: 'symmetrical',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'center_out',
    targetBehavior: 'growing',
    timingProfile: 'ramp',
    spatialLayout: 'center',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'spiral',
    targetBehavior: 'moving',
    timingProfile: 'endurance',
    spatialLayout: 'circular_perimeter',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'wave',
    targetBehavior: 'shrinking',
    timingProfile: 'wave',
    spatialLayout: 'random',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'lane_switch',
    targetBehavior: 'accelerating',
    timingProfile: 'sudden_spike',
    spatialLayout: 'tb_lanes',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'corner_seq',
    targetBehavior: 'direction_change',
    timingProfile: 'pressure',
    spatialLayout: 'corners',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'triple_burst',
    targetBehavior: 'fading',
    timingProfile: 'ramp',
    spatialLayout: 'grid',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'triple_burst',
    targetBehavior: 'stationary',
    timingProfile: 'sudden_spike',
    spatialLayout: 'grid',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'paired',
    targetBehavior: 'stationary',
    timingProfile: 'ramp',
    spatialLayout: 'symmetrical',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'center_out',
    targetBehavior: 'brief',
    timingProfile: 'pressure',
    spatialLayout: 'center',
    hasDecoyTargets: true
  }
]