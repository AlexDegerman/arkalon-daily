import { describe, it, expect } from 'vitest'
import {
  calcChargeLimit,
  calcClueTileCount,
  calcSpawnInterval,
  getSessionDurationMs,
  calcReticleX,
  SURGE_PLAY_WIDTH,
  SURGE_SESSION_DURATION_MS,
  STRIKE_TRACK_WIDTH
} from '@/lib/puzzles/compositionSystem'

describe('calcChargeLimit', () => {
  it('applies a base buffer of 3 for numeric clues', () => {
    expect(calcChargeLimit(5, 3, 'numeric')).toBe(6)
  })

  it('applies +1 extra cushion for directional clues', () => {
    expect(calcChargeLimit(5, 3, 'directional')).toBe(7)
  })

  it('applies a base buffer of 3 for adjacency_count clues', () => {
    expect(calcChargeLimit(6, 4, 'adjacency_count')).toBe(7)
  })

  it('applies +1 extra cushion for hot_cold clues', () => {
    expect(calcChargeLimit(7, 6, 'hot_cold')).toBe(10)
  })
})

describe('calcClueTileCount', () => {
  it('returns gridSize + depositCount', () => {
    expect(calcClueTileCount(5, 3)).toBe(8)
    expect(calcClueTileCount(7, 6)).toBe(13)
  })
})

describe('calcSpawnInterval', () => {
  it('ramps linearly from 520ms to 240ms over 60s', () => {
    expect(calcSpawnInterval('ramp', 0, 0)).toBe(520)
    expect(calcSpawnInterval('ramp', 30_000, 0)).toBe(380)
    expect(calcSpawnInterval('ramp', 60_000, 0)).toBe(240)
    expect(calcSpawnInterval('ramp', 120_000, 0)).toBe(240)
  })

  it('spikes suddenly at the 36s mark', () => {
    expect(calcSpawnInterval('sudden_spike', 35_999, 0)).toBe(420)
    expect(calcSpawnInterval('sudden_spike', 36_000, 0)).toBe(220)
  })

  it('oscillates as a sine wave for the wave profile', () => {
    expect(calcSpawnInterval('wave', 0, 0)).toBe(360)
    expect(calcSpawnInterval('wave', 3_750, 0)).toBeCloseTo(500, 5)
  })

  it('holds fixed intervals for endurance and pressure profiles', () => {
    expect(calcSpawnInterval('endurance', 12_345, 0)).toBe(320)
    expect(calcSpawnInterval('pressure', 54_321, 0)).toBe(260)
  })

  it('picks mixed segments deterministically from the seeded jitter', () => {
    expect(calcSpawnInterval('mixed', 0, 0)).toBe(250)
    expect(calcSpawnInterval('mixed', 0, 0.5)).toBe(340)
    expect(calcSpawnInterval('mixed', 0, 0.9)).toBe(440)
  })

  it('uses fixed intervals for slow_short and fast_long', () => {
    expect(calcSpawnInterval('slow_short', 0, 0)).toBe(420)
    expect(calcSpawnInterval('fast_long', 0, 0)).toBe(320)
  })
})

describe('getSessionDurationMs', () => {
  it('overrides duration for slow_short and fast_long', () => {
    expect(getSessionDurationMs('slow_short')).toBe(45_000)
    expect(getSessionDurationMs('fast_long')).toBe(90_000)
  })

  it('defaults to 60s for all other profiles', () => {
    expect(getSessionDurationMs('ramp')).toBe(SURGE_SESSION_DURATION_MS)
    expect(getSessionDurationMs('endurance')).toBe(60_000)
  })
})

describe('calcReticleX', () => {
  it('bounces linearly between 0 and the track width', () => {
    expect(calcReticleX('linear', 0, 1, 0.5)).toBe(0)
    expect(calcReticleX('linear', 3, 1, 0.5)).toBe(600)
    expect(calcReticleX('linear', 4.5, 1, 0.5)).toBe(300)
    expect(calcReticleX('linear', 6, 1, 0.5)).toBe(0)
  })

  it('oscillates sinusoidally around the track center', () => {
    expect(calcReticleX('sinusoidal', 0, 1, 0.5)).toBe(300)
    const x = calcReticleX('sinusoidal', 1, 1, 0.5)
    expect(x).toBeGreaterThanOrEqual(50)
    expect(x).toBeLessThanOrEqual(550)
  })

  it('keeps erratic motion clamped within the track', () => {
    for (let t = 0; t < 30; t += 0.37) {
      const x = calcReticleX('erratic', t, 1.5, 0.5)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(STRIKE_TRACK_WIDTH)
    }
  })

  it('falls back to linear motion for deceptive phases', () => {
    const deceptive = calcReticleX('deceptive', 1.2, 1, 0.5)
    const linear = calcReticleX('linear', 1.2, 1, 0.5)
    expect(deceptive).toBe(linear)
  })

  it('scales travel speed with the speed multiplier', () => {
    expect(calcReticleX('linear', 1, 2, 0.5)).toBe(400)
    expect(SURGE_PLAY_WIDTH).toBe(600)
  })
})
