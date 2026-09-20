import 'server-only'

import { mulberry32, hexToSeed } from './seededRandom'
import type { PuzzleFamilyDefinition, PuzzleSeedData } from '@/types/puzzle'

// Generates deterministic puzzle data from an HMAC seed.
// Each puzzle family owns its RNG initialization using the provided seed.
export function generateChallenge(
  seed: string,
  family: PuzzleFamilyDefinition
): PuzzleSeedData {
  if (!seed || !/^[0-9a-f]+$/i.test(seed)) {
    throw new Error(`Invalid seed format: ${seed}`)
  }
  return family.generate(seed)
}

// Converts a seed hex string to its 32-bit integer representation
// for use as the mulberry32 initial state.
export function seedToRng(seed: string): () => number {
  const int = hexToSeed(seed)
  return mulberry32(int)
}
