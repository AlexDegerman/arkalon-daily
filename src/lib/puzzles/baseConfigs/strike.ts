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
    targetWindowPx: 60,
    shotCount: 15,
    movementSpeed: 1.4,
    motionFunction: 'sinusoidal',
    timingWindowMs: 240
  },
  {
    targetWindowPx: 50,
    shotCount: 16,
    movementSpeed: 1.6,
    motionFunction: 'pendulum',
    timingWindowMs: 200
  },
  {
    targetWindowPx: 55,
    shotCount: 16,
    movementSpeed: 1.5,
    motionFunction: 'erratic',
    timingWindowMs: 220
  },
  {
    targetWindowPx: 45,
    shotCount: 18,
    movementSpeed: 1.8,
    motionFunction: 'linear',
    timingWindowMs: 160
  },
  {
    targetWindowPx: 50,
    shotCount: 18,
    movementSpeed: 1.5,
    motionFunction: 'staccato',
    timingWindowMs: 200
  },
  {
    targetWindowPx: 45,
    shotCount: 20,
    movementSpeed: 1.6,
    motionFunction: 'deceptive',
    timingWindowMs: 180
  },
  {
    targetWindowPx: 40,
    shotCount: 20,
    movementSpeed: 1.8,
    motionFunction: 'sinusoidal',
    timingWindowMs: 160
  },
  {
    targetWindowPx: 42,
    shotCount: 20,
    movementSpeed: 1.9,
    motionFunction: 'staccato',
    timingWindowMs: 150
  },
  {
    targetWindowPx: 38,
    shotCount: 22,
    movementSpeed: 1.8,
    motionFunction: 'erratic',
    timingWindowMs: 140
  },
  {
    targetWindowPx: 40,
    shotCount: 22,
    movementSpeed: 2.0,
    motionFunction: 'pendulum',
    timingWindowMs: 140
  },
  {
    targetWindowPx: 35,
    shotCount: 24,
    movementSpeed: 2.1,
    motionFunction: 'linear',
    timingWindowMs: 120
  },
  {
    targetWindowPx: 40,
    shotCount: 24,
    movementSpeed: 1.8,
    motionFunction: 'deceptive',
    timingWindowMs: 150
  },
  {
    targetWindowPx: 32,
    shotCount: 25,
    movementSpeed: 2.0,
    motionFunction: 'erratic',
    timingWindowMs: 120
  },
  {
    targetWindowPx: 38,
    shotCount: 28,
    movementSpeed: 2.2,
    motionFunction: 'deceptive',
    timingWindowMs: 100
  },
  {
    targetWindowPx: 34,
    shotCount: 30,
    movementSpeed: 2.3,
    motionFunction: 'deceptive',
    timingWindowMs: 85
  }
]