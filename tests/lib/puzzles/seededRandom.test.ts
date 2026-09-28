import { describe, it, expect } from 'vitest'
import {
  mulberry32,
  hexToSeed,
  nextInt,
  nextFloat,
  pickOne,
  shuffle,
  shuffleInPlace
} from '@/lib/puzzles/seededRandom'

describe('mulberry32', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b())
    }
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  it('always returns values in [0, 1)', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('hexToSeed', () => {
  it('parses the first 8 hex characters into an unsigned 32-bit integer', () => {
    expect(hexToSeed('00000001')).toBe(1)
    expect(hexToSeed('ffffffff')).toBe(4294967295)
    expect(hexToSeed('deadbeef00000000')).toBe(0xdeadbeef)
  })
})

describe('nextInt', () => {
  it('returns integers within [0, n)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 500; i++) {
      const v = nextInt(rng, 10)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(10)
    }
  })
})

describe('nextFloat', () => {
  it('returns values within [min, max)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 500; i++) {
      const v = nextFloat(rng, 5, 10)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThan(10)
    }
  })
})

describe('pickOne', () => {
  it('always returns an element from the source array', () => {
    const rng = mulberry32(7)
    const arr = ['a', 'b', 'c']
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(pickOne(rng, arr))
    }
  })

  it('is deterministic for identical seeds', () => {
    const arr = ['a', 'b', 'c', 'd'] as const
    const rngA = mulberry32(99)
    const rngB = mulberry32(99)
    const picksA = Array.from({ length: 20 }, () => pickOne(rngA, arr))
    const picksB = Array.from({ length: 20 }, () => pickOne(rngB, arr))
    expect(picksA).toEqual(picksB)
  })
})

describe('shuffle', () => {
  it('does not mutate the source array', () => {
    const rng = mulberry32(7)
    const source = [1, 2, 3, 4, 5]
    const snapshot = [...source]
    shuffle(rng, source)
    expect(source).toEqual(snapshot)
  })

  it('preserves all elements', () => {
    const rng = mulberry32(7)
    const source = [1, 2, 3, 4, 5, 6, 7, 8]
    const result = shuffle(rng, source)
    expect([...result].sort((a, b) => a - b)).toEqual(source)
  })

  it('is deterministic for identical seeds', () => {
    const source = ['a', 'b', 'c', 'd', 'e']
    const a = shuffle(mulberry32(55), source)
    const b = shuffle(mulberry32(55), source)
    expect(a).toEqual(b)
  })
})

describe('shuffleInPlace', () => {
  it('mutates and returns the same array reference', () => {
    const rng = mulberry32(7)
    const arr = [1, 2, 3, 4, 5]
    const result = shuffleInPlace(rng, arr)
    expect(result).toBe(arr)
    expect([...arr].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })
})
