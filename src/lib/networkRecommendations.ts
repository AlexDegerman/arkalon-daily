export interface RecommendationEntry {
  appName: string
  tagline: string
  url: string
}

// The Arkalon Network hub (identity, recovery, app directory)
export const NETWORK_HUB_URL = 'https://network.rpsleague.fi'

// Pool of cross-app recommendations; one is picked at random per result
// screen. A single entry always shows; each added app splits the odds
// evenly. These are the only cross-app integration points in Arkalon
// Daily. Add in future arkalon apps
export const NETWORK_RECOMMENDATIONS: RecommendationEntry[] = [
  {
    appName: 'RPS League',
    tagline:
      'Predict rock paper scissors every 5 seconds. Endless events, progression, and leaderboards.',
    url: 'https://rpsleague.fi'
  }
]

export function pickNetworkRecommendation(): RecommendationEntry | null {
  if (NETWORK_RECOMMENDATIONS.length === 0) return null
  const index = Math.floor(Math.random() * NETWORK_RECOMMENDATIONS.length)
  return NETWORK_RECOMMENDATIONS[index] ?? null
}
