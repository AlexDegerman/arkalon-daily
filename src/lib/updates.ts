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
      'Arkalon Daily launches: five optional daily puzzles, one attempt per category per day, resetting at 00:00 UTC.',
      'Recall, Surge, Cipher, Strike, and Depths are live.',
      'Deterministic daily seeds: every player faces the identical challenge, generated and validated server-side.',
      'First-contact Trials with explainers teach each puzzle before your first recorded attempt.',
      'Server-authoritative scoring on a single 0-100 curve with rarity-tiered result frames and per-category metrics.',
      'Per-category daily leaderboards (top 50 plus your exact rank) and Yesterday\u2019s Review community telemetry.',
      'Category streaks with 7 / 30 / 100 / 365-day milestone celebrations, spoken by Arkalon.',
      'Share cards: client-rendered result images with per-category performance strips via the Web Share API.',
      'Arkalon Voice, per-category background music, and a three-channel sound system.',
      'Zero-friction identity via the Arkalon Network hub, with recovery codes and a guided recovery tutorial.'
    ]
  }
]

export const LATEST_UPDATE = UPDATES[0]
export const UPDATES_VERSION = LATEST_UPDATE.id
