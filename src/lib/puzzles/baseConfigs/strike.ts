import 'server-only'

import type { MotionFunctionId } from '@/types/puzzle'

export interface StrikeBaseConfig {
  targetWindowPx: number
  shotCount: number
  movementSpeed: number
  motionFunction: MotionFunctionId
  timingWindowMs: number
}

export const STRIKE_BASE_CONFIGS: StrikeBaseConfig[] = [
  {
    targetWindowPx: 80,
    shotCount: 12,
    movementSpeed: 1.0,
    motionFunction: 'linear',
    timingWindowMs: 350
  },
  {
    targetWindowPx: 60,
    shotCount: 15,
    movementSpeed: 1.2,
    motionFunction: 'linear',
    timingWindowMs: 280
  },
  {
    targetWindowPx: 70,
    shotCount: 12,
    movementSpeed: 1.0,
    motionFunction: 'sinusoidal',
    timingWindowMs: 300
  },
  {
    targetWindowPx: 50,
    shotCount: 18,
    movementSpeed: 1.4,
    motionFunction: 'linear',
    timingWindowMs: 220
  },
  {
    targetWindowPx: 60,
    shotCount: 15,
    movementSpeed: 1.2,
    motionFunction: 'sinusoidal',
    timingWindowMs: 260
  },
  {
    targetWindowPx: 40,
    shotCount: 20,
    movementSpeed: 1.6,
    motionFunction: 'linear',
    timingWindowMs: 180
  },
  {
    targetWindowPx: 70,
    shotCount: 12,
    movementSpeed: 1.0,
    motionFunction: 'erratic',
    timingWindowMs: 300
  },
  {
    targetWindowPx: 50,
    shotCount: 18,
    movementSpeed: 1.4,
    motionFunction: 'sinusoidal',
    timingWindowMs: 200
  },
  {
    targetWindowPx: 30,
    shotCount: 22,
    movementSpeed: 1.8,
    motionFunction: 'linear',
    timingWindowMs: 150
  },
  {
    targetWindowPx: 60,
    shotCount: 15,
    movementSpeed: 1.2,
    motionFunction: 'erratic',
    timingWindowMs: 240
  },
  {
    targetWindowPx: 40,
    shotCount: 20,
    movementSpeed: 1.6,
    motionFunction: 'sinusoidal',
    timingWindowMs: 180
  },
  {
    targetWindowPx: 50,
    shotCount: 18,
    movementSpeed: 1.4,
    motionFunction: 'deceptive',
    timingWindowMs: 200
  },
  {
    targetWindowPx: 30,
    shotCount: 25,
    movementSpeed: 2.0,
    motionFunction: 'erratic',
    timingWindowMs: 130
  },
  {
    targetWindowPx: 20,
    shotCount: 28,
    movementSpeed: 2.4,
    motionFunction: 'deceptive',
    timingWindowMs: 100
  },
  {
    targetWindowPx: 18,
    shotCount: 30,
    movementSpeed: 2.6,
    motionFunction: 'deceptive',
    timingWindowMs: 90
  }
]
