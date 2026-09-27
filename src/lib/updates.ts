export interface UpdateEntry {
  id: string
  version: string
  date: string
  changes: string[]
}

// Version history for the UpdateModal and Updates page.
export const UPDATES: UpdateEntry[] = [
  {
    id: 'v1.0.0-launch',
    version: '1.0.0',
    date: '2027-01-01',
    changes: [
      'Arkalon Daily launch: five daily cognitive challenges covering Recall (memory), Surge (reflex), Cipher (logic), Strike (timing), and Depths (spatial deduction).',
      'Global daily seeds: identical challenges for all players worldwide, resetting every day at 00:00 UTC.',
      'Procedural puzzle variety: hundreds of unique permutations per discipline with zero-guess fairness guarantees.',
      "Interactive Trials: guided practice explainers to master each puzzle's rules before committing to your daily attempt.",
      'Ranked leaderboards: compete on daily, weekly, all-time, and cross-category TOTAL score boards with live percentile tracking.',
      'Streaks & milestones: build daily streaks with celebratory tier overlays and voice proclamations at 7, 30, 100, and 365 days.',
      "Yesterday's Review: community stats showing player counts, average scores, and score distributions from the previous day.",
      'Instant play: no passwords or sign-up forms required - jump straight in with anonymous ecosystem identity and recovery codes.',
      'Visual share cards: generate clean graphic cards showing your score, streak, and round-by-round performance for social sharing.',
      'Full soundtrack & voice: genre-distinct background music for every puzzle, responsive sound effects, and spoken Arkalon Voice commentary.',
      'Player profiles: customize your identity with procedural nicknames, dynamic avatars, and 5-discipline skill balance charts.',
      'Installable PWA: play seamlessly in your browser or install as a standalone app on iOS, Android, and desktop.'
    ]
  }
]

export const LATEST_UPDATE = UPDATES[0]
export const UPDATES_VERSION = LATEST_UPDATE.id
