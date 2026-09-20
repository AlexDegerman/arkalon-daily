import 'server-only'

import { ArkalonVisionFamily } from './families/arkalonVision'
import { SurgeFrenzyFamily } from './families/surgeFrenzy'
import { WildPredictionFamily } from './families/wildPrediction'
import { SniperChallengeFamily } from './families/sniperChallenge'
import { CrystalMineFamily } from './families/crystalMine'
import type { PuzzleFamilyDefinition, PuzzleCategory } from '@/types/puzzle'

// Single source of truth for all registered puzzle families.
// Adding a new family costs one entry here plus one component - no other changes.
export const FAMILY_REGISTRY: Map<string, PuzzleFamilyDefinition> = new Map([
  [ArkalonVisionFamily.id, ArkalonVisionFamily],
  [SurgeFrenzyFamily.id, SurgeFrenzyFamily],
  [WildPredictionFamily.id, WildPredictionFamily],
  [SniperChallengeFamily.id, SniperChallengeFamily],
  [CrystalMineFamily.id, CrystalMineFamily]
])

// Canonical family ID for each category in 1.0 (one family per category)
export const CATEGORY_FAMILY_MAP: Record<PuzzleCategory, string> = {
  recall: ArkalonVisionFamily.id,
  surge: SurgeFrenzyFamily.id,
  cipher: WildPredictionFamily.id,
  strike: SniperChallengeFamily.id,
  depths: CrystalMineFamily.id
}

// Returns the family definition for a given family ID, or null if not found.
export function getFamily(familyId: string): PuzzleFamilyDefinition | null {
  return FAMILY_REGISTRY.get(familyId) ?? null
}

// Returns the canonical family definition for a category.
export function getFamilyForCategory(
  category: PuzzleCategory
): PuzzleFamilyDefinition {
  const id = CATEGORY_FAMILY_MAP[category]
  const family = FAMILY_REGISTRY.get(id)
  if (!family) throw new Error(`No family registered for category: ${category}`)
  return family
}
