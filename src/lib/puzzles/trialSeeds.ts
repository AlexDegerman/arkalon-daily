import 'server-only'

import type { PuzzleCategory } from '@/types/puzzle'

// Fixed seeds for trial runs. These create deterministic challenges without
// using the daily HMAC seed.
export const TRIAL_SEEDS: Record<PuzzleCategory, string> = {
  recall: 'trial_recall__fixed_seed_0000000000000000000000000000000000000000',
  surge: 'trial_surge___fixed_seed_0000000000000000000000000000000000000000',
  cipher: 'trial_cipher__fixed_seed_0000000000000000000000000000000000000000',
  strike: 'trial_strike__fixed_seed_0000000000000000000000000000000000000000',
  depths: 'trial_depths__fixed_seed_0000000000000000000000000000000000000000'
}

export function isTrialSeed(seed: string): boolean {
  return seed.startsWith('trial_')
}
