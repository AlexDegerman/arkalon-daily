import { describe, it, expect } from 'vitest'
import {
  FAMILY_REGISTRY,
  CATEGORY_FAMILY_MAP,
  getFamily,
  getFamilyForCategory
} from '@/lib/puzzles/familyRegistry'
import { CATEGORY_ORDER } from '@/constants/categories'

describe('FAMILY_REGISTRY', () => {
  it('registers exactly five puzzle families', () => {
    expect(FAMILY_REGISTRY.size).toBe(5)
  })

  it('registers every family under a unique, non-empty id', () => {
    const ids = Array.from(FAMILY_REGISTRY.keys())
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id.length).toBeGreaterThan(0)
    }
  })

  it('registers families with complete definitions', () => {
    for (const family of FAMILY_REGISTRY.values()) {
      expect(family.id).toBeTruthy()
      expect(family.displayName).toBeTruthy()
      expect(family.category).toBeTruthy()
    }
  })
})

describe('CATEGORY_FAMILY_MAP', () => {
  it('maps every category in CATEGORY_ORDER to a registered family', () => {
    for (const category of CATEGORY_ORDER) {
      const familyId = CATEGORY_FAMILY_MAP[category]
      expect(familyId).toBeTruthy()
      expect(FAMILY_REGISTRY.has(familyId)).toBe(true)
    }
  })

  it('maps each category to a family whose category field matches', () => {
    for (const category of CATEGORY_ORDER) {
      const family = getFamilyForCategory(category)
      expect(family.category).toBe(category)
    }
  })
})

describe('getFamily', () => {
  it('returns the family for a registered id', () => {
    const family = getFamily('arkalon_vision')
    expect(family).not.toBeNull()
    expect(family?.id).toBe('arkalon_vision')
  })

  it('returns null for an unknown id', () => {
    expect(getFamily('does_not_exist')).toBeNull()
  })
})

describe('getFamilyForCategory', () => {
  it('returns the canonical family for each category', () => {
    expect(getFamilyForCategory('recall').id).toBe('arkalon_vision')
    expect(getFamilyForCategory('surge').id).toBe('surge_frenzy')
    expect(getFamilyForCategory('cipher').id).toBe('wild_prediction')
    expect(getFamilyForCategory('strike').id).toBe('sniper_challenge')
    expect(getFamilyForCategory('depths').id).toBe('crystal_mine')
  })
})
