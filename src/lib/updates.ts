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
      'Arkalon Daily launches with five daily puzzle categories.',
      'Recall, Surge, Cipher, Strike, and Depths are now live.',
      'Per-category leaderboards, streaks, and share cards.'
    ]
  }
]

export const LATEST_UPDATE = UPDATES[0]
export const UPDATES_VERSION = LATEST_UPDATE.id
