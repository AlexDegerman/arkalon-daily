import type { PuzzleCategory } from '@/types/puzzle'

export interface RecommendationEntry {
  appName: string
  tagline: string
  url: string
  skillMatch: string // describes why this recommendation fits the category
}

// Static skill-matched recommendations per category
// These are the only cross-app integration points in Arkalon Daily.
// Add in future arkalon apps
export const NETWORK_RECOMMENDATIONS: Record<
  PuzzleCategory,
  RecommendationEntry
> = {
  recall: {
    appName: 'RPS League',
    tagline: 'Pattern reading and prediction at scale.',
    url: 'https://rpsleague.fi',
    skillMatch: 'Strong recall performance'
  },
  surge: {
    appName: 'RPS League',
    tagline: 'Fast decisions under pressure.',
    url: 'https://rpsleague.fi',
    skillMatch: 'High reaction speed'
  },
  strike: {
    appName: 'RPS League',
    tagline: 'Precision timing across competitive rounds.',
    url: 'https://rpsleague.fi',
    skillMatch: 'Precise timing'
  },
  // 
}
