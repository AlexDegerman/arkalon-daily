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
      'Arkalon Daily launches: five optional daily puzzle categories covering Recall, Surge, Cipher, Strike, and Depths, each targeting a distinct cognitive skill. One attempt per category per day, resetting at 00:00 UTC.',
      'Deterministic puzzle engine: daily seeds derived from HMAC-SHA256(secret, "YYYY-MM-DD:category") and consumed server-side by a mulberry32 seeded PRNG so every player receives the identical challenge without any server-side game tick.',
      'Five registered puzzle families across five categories: Arkalon Vision (Recall), Surge Frenzy (Surge), Wild Prediction (Cipher), Sniper Challenge (Strike), and Crystal Mine (Depths). Each category ships 15 hand-crafted base configurations with continuous parameter variation, producing 200+ meaningfully distinct daily instances.',
      'Per-family composition axes: 19 spawn patterns, 10 target behaviors, 8 timing profiles and 10 spatial layouts for Surge; 7 pattern generators for Cipher; 4 clue types and 8 deposit patterns for Depths; 12-30 shots and 4 reticle motion functions including deceptive feints for Strike; sequence lengths 3-12 with shuffled keypads and reverse-entry final rounds for Recall.',
      'Per-family validators reject unfair or degenerate combinations and retry with deterministic derived seeds, keeping the accepted challenge identical for all players. Depths runs a full clue-elimination solvability proof before acceptance.',
      'First-contact Trials: multi-screen explainers followed by seeded practice runs on constrained axes introduce each mechanic without difficulty spikes. Completion unlocks the real daily attempt; a persistent amber banner marks every trial run.',
      'Server-authoritative scoring: clients submit raw performance metrics; the server recomputes normalized_score (0-100) from scratch. Per-family models: continuous (Recall), speed-first (Surge, Strike), logic-first (Cipher, Depths).',
      'Daily leaderboards: top 50 per category ordered by score descending then elapsed ascending, with exact rank computation for players outside the top 50. Weekly and All-Time aggregate tiers with minimum-match thresholds also implemented in the data layer.',
      "Yesterday's Review: per-category community telemetry covering player count, average, median, top-1% threshold, and a five-bucket score distribution, plus your rank and percentile if you played.",
      'Per-category streaks recomputed by walking consecutive UTC dates backward. Milestones at 7, 30, 100, and 365 days fire rarity-tiered overlays (Rare, Legendary, Mythical, Rainbow) with dedicated sound stings and spoken Arkalon proclamations, celebrated once per category per milestone.',
      'Zero-friction anonymous identity provisioned by the Arkalon Network hub via root cookies, with procedural rerollable nicknames. A one-time server-persisted Recovery Tutorial overlay teaches players to save their hub recovery code.',
      'Share cards: client-rendered 540x675 result images at 2x scale via html2canvas, handed to the Web Share API with file attachment and desktop download/clipboard fallbacks. Each category has a unique performance strip: glyph accuracy grid, reaction-time bar chart, round check/cross sequence, shot grade letters, and crystal excavation mini-grid.',
      'Three independent audio channels (Sound FX, Music, Arkalon Voice) with per-channel toggles and volumes persisted locally. HTML5 audio pools and a Web Audio polyphony engine (6 simultaneous voices) cover all effects. Context-aware BGM loops one genre-distinct track per category with 1-second crossfades.',
      'Arkalon Voice via browser-native Web Speech API at pitch 0.25 and rate 0.75 with synthetic cadence pauses, delivering the daily welcome, category entries, result verdicts, and milestone proclamations at zero server cost.',
      'Profile and progression: deterministic gradient avatars, identity card with badge chips, a Skill Profile bar chart of per-category averages shown at 3+ plays, and per-category stats panels with best score, average, days played, current and longest streak, and global percentile.',
      'Fair play and session integrity: one attempt per player/date/category enforced by a database unique constraint. BroadcastChannel tab guard pauses gameplay on duplicate tabs; real-time puzzles pause on tab hide and Escape. A blurred PauseOverlay with a 3-2-1 countdown excludes paused milliseconds from all timing metrics. Submission rate limiting at 5 per minute and turn-based mid-session persistence via localStorage.',
      'Progressive Web App: installable on iOS 14+, Android 9+, and desktop. Responsive from 320px to ultra-wide with a 50/50 Mission Control split layout on wide viewports.'
    ]
  }
]

export const LATEST_UPDATE = UPDATES[0]
export const UPDATES_VERSION = LATEST_UPDATE.id
