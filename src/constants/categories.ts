import type { PuzzleCategory } from '@/types/puzzle'
export interface CategoryDefinition {
  slug: PuzzleCategory
  icon: string
  displayName: string
  accentColor: string
  description: string
  spec: string
}
export const CATEGORIES: Record<PuzzleCategory, CategoryDefinition> = {
  recall: {
    slug: 'recall',
    icon: '\u{1F9E0}',
    displayName: 'Recall',
    accentColor: '#39ff8a',
    description: 'Working Memory',
    spec: '3 Sequences • Memory'
  },
  surge: {
    slug: 'surge',
    icon: '\u26A1',
    displayName: 'Surge',
    accentColor: '#00d4ff',
    description: 'Reflex Speed',
    spec: '60s Survival • Reflex'
  },
  cipher: {
    slug: 'cipher',
    icon: '\u{1F522}',
    displayName: 'Cipher',
    accentColor: '#a78bfa',
    description: 'Pattern Logic',
    spec: 'Rule Discovery • Logic'
  },
  strike: {
    slug: 'strike',
    icon: '\u{1F3AF}',
    displayName: 'Strike',
    accentColor: '#ff3b5c',
    description: 'Precision Timing',
    spec: 'Moving Reticle • Timing'
  },
  depths: {
    slug: 'depths',
    icon: '\u{1F537}',
    displayName: 'Depths',
    accentColor: '#4fc3ff',
    description: 'Spatial Deduction',
    spec: '5-7 Grid • Deduction'
  }
}
export const CATEGORY_ORDER: PuzzleCategory[] = [
  'recall',
  'surge',
  'cipher',
  'strike',
  'depths'
]