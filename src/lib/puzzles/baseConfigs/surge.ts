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
    spawnPattern: 'single',
    targetBehavior: 'stationary',
    timingProfile: 'ramp',
    spatialLayout: 'grid',
    hasDecoyTargets: false
  },
  {
    spawnPattern: 'alternating',
    targetBehavior: 'moving',
    timingProfile: 'ramp',
    spatialLayout: 'lr_lanes',
    hasDecoyTargets: false
  },
  {
    spawnPattern: 'zigzag',
    targetBehavior: 'stationary',
    timingProfile: 'wave',
    spatialLayout: 'random',
    hasDecoyTargets: false
  },
  {
    spawnPattern: 'circular',
    targetBehavior: 'fading',
    timingProfile: 'endurance',
    spatialLayout: 'circular_perimeter',
    hasDecoyTargets: false
  },
  {
    spawnPattern: 'scatter',
    targetBehavior: 'brief',
    timingProfile: 'sudden_spike',
    spatialLayout: 'random',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'h_sweep',
    targetBehavior: 'accelerating',
    timingProfile: 'ramp',
    spatialLayout: 'grid',
    hasDecoyTargets: false
  },
  {
    spawnPattern: 'expanding',
    targetBehavior: 'stationary',
    timingProfile: 'pressure',
    spatialLayout: 'center',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'paired',
    targetBehavior: 'moving',
    timingProfile: 'wave',
    spatialLayout: 'symmetrical',
    hasDecoyTargets: false
  },
  {
    spawnPattern: 'corner_seq',
    targetBehavior: 'direction_change',
    timingProfile: 'mixed',
    spatialLayout: 'corners',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'wave',
    targetBehavior: 'shrinking',
    timingProfile: 'ramp',
    spatialLayout: 'random',
    hasDecoyTargets: false
  },
  {
    spawnPattern: 'spiral',
    targetBehavior: 'fading',
    timingProfile: 'endurance',
    spatialLayout: 'circular_perimeter',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'lane_switch',
    targetBehavior: 'accelerating',
    timingProfile: 'sudden_spike',
    spatialLayout: 'tb_lanes',
    hasDecoyTargets: false
  },
  {
    spawnPattern: 'triple_burst',
    targetBehavior: 'stationary',
    timingProfile: 'pressure',
    spatialLayout: 'grid',
    hasDecoyTargets: true
  },
  {
    spawnPattern: 'center_out',
    targetBehavior: 'growing',
    timingProfile: 'slow_short',
    spatialLayout: 'center',
    hasDecoyTargets: false
  },
  {
    spawnPattern: 'outside_in',
    targetBehavior: 'splitting',
    timingProfile: 'fast_long',
    spatialLayout: 'narrow_corridor',
    hasDecoyTargets: true
  }
]
