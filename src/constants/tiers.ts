export const SCORE_TIER_THRESHOLDS: { min: number; cls: string }[] = [
  { min: 96, cls: 'g-vg' },
  { min: 90, cls: 'g-spd' },
  { min: 80, cls: 'g-td' },
  { min: 70, cls: 'g-ud' },
  { min: 50, cls: 'g-b1' },
  { min: 0, cls: 'g-m1' }
]

// Rarity tier mapping for result frame borders and streak badge styling
export const RARITY_SCORE_THRESHOLDS: { min: number; rarity: string }[] = [
  { min: 96, rarity: 'mythical' },
  { min: 85, rarity: 'legendary' },
  { min: 70, rarity: 'epic' },
  { min: 50, rarity: 'rare' },
  { min: 0, rarity: 'common' }
]

export const STREAK_RARITY_MAP: Record<number, string> = {
  7: 'rare',
  30: 'legendary',
  100: 'mythical',
  365: 'rainbow'
}