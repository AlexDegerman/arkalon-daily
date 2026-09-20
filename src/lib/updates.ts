export interface UpdateEntry {
  version: string
  date: string
  changes: string[]
}

// Version history for the UpdateModal.
// Prepend new entries when releasing updates.
export const UPDATES: UpdateEntry[] = [
  {
    version: '1.0.0',
    date: '2027-01-01',
    changes: [
      'Arkalon Daily launches with five daily puzzle categories.',
      'Recall, Surge, Cipher, Strike, and Depths are now live.',
      'Per-category leaderboards, streaks, and share cards.'
    ]
  }
]

export const CURRENT_VERSION = '1.0.0'
