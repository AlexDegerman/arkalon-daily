export const TTS_LINES = {
  // Daily welcome (once per UTC day on homepage load)
  dailyWelcome: 'The... challenges... await.',

  // Category entry lines (on entering each category)
  categoryEntry: {
    recall: 'The glyphs... demand... to be remembered.',
    surge: 'The storm... remembers your name.',
    cipher: 'The cards... have chosen... to speak.',
    strike: 'One shot... one moment... make it count.',
    depths: 'The crystal depths... awaken.'
  },

  // Trial entry
  trialEntry: 'Initiating... trial sequence.',

  // Result rating (score-tiered)
  result: {
    tier96: 'Exceptional... performance... recorded.',
    tier90: 'Precision... acknowledged.',
    tier80: 'Competent... execution... noted.',
    tier70: 'Adequate... but room... for refinement.',
    tier50: 'The data... has been... catalogued.',
    tier0: 'The challenge... proved... formidable.'
  },

  // All five categories complete
  allComplete:
    'All sequences... concluded. Return... when the cycle... renews.',

  // Streak milestones
  streakMilestone: {
    7: 'Seven cycles... unbroken.',
    30: 'Thirty cycles... your persistence... is noted.',
    100: 'One hundred cycles... remarkable... endurance.',
    365: 'A full revolution... around the star. Extraordinary.'
  }
} as const

// Returns the correct result TTS line for a given score.
export function getResultTTSLine(score: number): string {
  if (score >= 96) return TTS_LINES.result.tier96
  if (score >= 90) return TTS_LINES.result.tier90
  if (score >= 80) return TTS_LINES.result.tier80
  if (score >= 70) return TTS_LINES.result.tier70
  if (score >= 50) return TTS_LINES.result.tier50
  return TTS_LINES.result.tier0
}

// Returns the correct streak milestone TTS line, or null if not a milestone.
export function getMilestoneTTSLine(milestone: number): string | null {
  const key = milestone as keyof typeof TTS_LINES.streakMilestone
  return TTS_LINES.streakMilestone[key] ?? null
}
