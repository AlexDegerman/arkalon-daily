import type { PuzzleCategory } from '@/types/puzzle'

export interface CategoryDefinition {
  slug: PuzzleCategory
  icon: string
  displayName: string
  accentColor: string
  accentClass: string
  description: string
  arkalonLine: string
}

export const CATEGORIES: Record<PuzzleCategory, CategoryDefinition> = {
  recall: {
    slug: 'recall',
    icon: '\u{1F9E0}',
    displayName: 'Recall',
    accentColor: '#39ff8a',
    accentClass: 'text-[#39ff8a]',
    description: 'Remember the glyphs',
    arkalonLine: 'The glyphs... demand... to be remembered.'
  },
  surge: {
    slug: 'surge',
    icon: '\u26A1',
    displayName: 'Surge',
    accentColor: '#00d4ff',
    accentClass: 'text-[#00d4ff]',
    description: 'Catch the storm',
    arkalonLine: 'The storm... remembers your name.'
  },
  cipher: {
    slug: 'cipher',
    icon: '\u{1F522}',
    displayName: 'Cipher',
    accentColor: '#a78bfa',
    accentClass: 'text-[#a78bfa]',
    description: 'Decode the pattern',
    arkalonLine: 'The cards... have chosen... to speak.'
  },
  strike: {
    slug: 'strike',
    icon: '\u{1F3AF}',
    displayName: 'Strike',
    accentColor: '#ff3b5c',
    accentClass: 'text-[#ff3b5c]',
    description: 'Time the shot',
    arkalonLine: 'One shot... one moment... make it count.'
  },
  depths: {
    slug: 'depths',
    icon: '\u{1F537}',
    displayName: 'Depths',
    accentColor: '#4fc3ff',
    accentClass: 'text-[#4fc3ff]',
    description: 'Unearth the crystals',
    arkalonLine: 'The crystal depths... awaken.'
  }
}

export const CATEGORY_ORDER: PuzzleCategory[] = [
  'recall',
  'surge',
  'cipher',
  'strike',
  'depths'
]

export const CATEGORY_ACCENT_MAP: Record<PuzzleCategory, string> = {
  recall: '#39ff8a',
  surge: '#00d4ff',
  cipher: '#a78bfa',
  strike: '#ff3b5c',
  depths: '#4fc3ff'
}

export const CATEGORY_BORDER_MAP: Record<PuzzleCategory, string> = {
  recall: 'border-[#39ff8a]',
  surge: 'border-[#00d4ff]',
  cipher: 'border-[#a78bfa]',
  strike: 'border-[#ff3b5c]',
  depths: 'border-[#4fc3ff]'
}

export const CATEGORY_BG_MAP: Record<PuzzleCategory, string> = {
  recall: 'bg-[#39ff8a]',
  surge: 'bg-[#00d4ff]',
  cipher: 'bg-[#a78bfa]',
  strike: 'bg-[#ff3b5c]',
  depths: 'bg-[#4fc3ff]'
}
