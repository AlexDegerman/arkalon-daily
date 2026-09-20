import 'server-only'

// mulberry32 seeded PRNG used for deterministic puzzle generation.
// Converts a fixed seed into repeatable random values for daily challenges.
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0
    let z = s
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000
  }
}

export function hexToSeed(hex: string): number {
  return parseInt(hex.slice(0, 8), 16) >>> 0
}

export function nextInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n)
}

export function nextFloat(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

export function pickOne<T>(rng: () => number, arr: readonly T[]): T {
  return arr[nextInt(rng, arr.length)]
}

export function shuffleInPlace<T>(rng: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  return shuffleInPlace(rng, [...arr])
}
