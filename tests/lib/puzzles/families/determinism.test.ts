import { describe, it, expect } from 'vitest'
import {
  FAMILY_REGISTRY,
  CATEGORY_FAMILY_MAP
} from '@/lib/puzzles/familyRegistry'
import { CATEGORY_ORDER } from '@/constants/categories'

const SEEDS = ['00000001', 'deadbeef', 'a1b2c3d4', '0f0f0f0f', '12345678']

describe('cross-family determinism', () => {
  it('every family is pure: identical seed yields identical output', () => {
    for (const family of FAMILY_REGISTRY.values()) {
      for (const seed of SEEDS) {
        const a = family.generate(seed)
        const b = family.generate(seed)
        expect(a, `${family.id} @ ${seed}`).toEqual(b)
      }
    }
  })

  it('different seeds yield different challenges', () => {
    for (const family of FAMILY_REGISTRY.values()) {
      const a = family.generate(SEEDS[0])
      const b = family.generate(SEEDS[1])
      expect(a, family.id).not.toEqual(b)
    }
  })

  it('every category maps to a registered family', () => {
    for (const category of CATEGORY_ORDER) {
      const familyId = CATEGORY_FAMILY_MAP[category]
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
