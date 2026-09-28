import { describe, it, expect } from 'vitest'
import {
  FAMILY_REGISTRY,
  CATEGORY_FAMILY_MAP
} from '@/lib/puzzles/familyRegistry'
import { CATEGORY_ORDER } from '@/constants/categories'
import type { PuzzleCategory } from '@/types/puzzle'

const SEEDS = ['00000001', 'deadbeef', 'a1b2c3d4', '0f0f0f0f', '12345678']

describe('cross-family determinism', () => {
  it('every family is pure: identical seed yields byte-identical output', () => {
    for (const family of FAMILY_REGISTRY.values()) {
      for (const seed of SEEDS) {
        const a = JSON.stringify(family.generate(seed))
        const b = JSON.stringify(family.generate(seed))
        expect(a, `${family.id} @ ${seed}`).toBe(b)
      }
    }
  })

  it('different seeds yield different challenges', () => {
    for (const family of FAMILY_REGISTRY.values()) {
      const a = JSON.stringify(family.generate(SEEDS[0]))
      const b = JSON.stringify(family.generate(SEEDS[1]))
      expect(a, family.id).not.toBe(b)
    }
  })

  it('every category maps to a registered family', () => {
    for (const category of CATEGORY_ORDER) {
      const familyId = CATEGORY_FAMILY_MAP[category as PuzzleCategory]
      expect(FAMILY_REGISTRY.has(familyId)).toBe(true)
    }
  })

  it('every family honors the PuzzleFamilyDefinition contract', () => {
    for (const family of FAMILY_REGISTRY.values()) {
      const data = family.generate('cafebabe')
      expect(data).toHaveProperty('profile')
      expect(data).toHaveProperty('familyData')
      expect(family.resultMetrics.length).toBeGreaterThan(0)
      expect(['speed-first', 'logic-first', 'continuous']).toContain(
        family.scoringModel
      )
    }
  })
})
