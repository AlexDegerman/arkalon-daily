export const SCORE_TIER_THRESHOLDS: { min: number; cls: string }[] = [
  { min: 100, cls: 'g-tqgs' },
  { min: 96, cls: 'g-ttr' },
  { min: 90, cls: 'g-dqgs' },
  { min: 85, cls: 'g-sxqg' },
  { min: 80, cls: 'g-str' },
  { min: 70, cls: 'g-qntr' },
  { min: 60, cls: 'g-nvg' },
  { min: 50, cls: 'g-tqg' },
  { min: 40, cls: 'g-dvg' },
  { min: 30, cls: 'g-ntg' },
  { min: 15, cls: 'g-qnqg' },
  { min: 0, cls: 'g-vg' }
]

// Rarity tier mapping for result frame borders and streak badge styling
export const RARITY_SCORE_THRESHOLDS: { min: number; rarity: string }[] = [
  { min: 96, rarity: 'mythical' },
  { min: 85, rarity: 'legendary' },
  { min: 70, rarity: 'epic' },
  { min: 50, rarity: 'rare' },
  { min: 0, rarity: 'common' }
]