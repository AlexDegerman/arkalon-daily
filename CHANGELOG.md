# Changelog

All notable updates to Arkalon Daily are documented here and surfaced in-app through the Update Modal and the `/updates` page.

## [1.0] - Platform Launch

### Added

- Five Daily Puzzles: Launched five optional daily puzzle categories covering Recall, Surge, Cipher, Strike, and Depths, each targeting a distinct cognitive skill: working memory, reflex speed, pattern logic, precision timing, and spatial deduction. One attempt per category per day, resetting at 00:00 UTC.

- Deterministic Puzzle Engine: Daily seeds derived with `HMAC-SHA256(secret, "YYYY-MM-DD:category")` and consumed server-side by a mulberry32 seeded PRNG, so every player receives the identical challenge without any server-side game tick. Each category ships 15 hand-crafted base configurations with continuous parameter variation (timing +/-12%, windows +/-10%, speed +/-8%), producing 200+ meaningfully distinct daily instances per category.

- Compositional Variation and Validation: Full axis unions per family covering 19 spawn patterns, 10 target behaviors, 8 timing profiles and 10 spatial layouts for Surge; 7 pattern generators for Cipher; 4 clue types and 8 deposit patterns for Depths; 4 reticle motion functions including deceptive feints for Strike. Per-family validators reject unfair or monotone combinations and retry with deterministic derived seeds, keeping the accepted challenge identical for all players.

- First-Contact Trials: Fixed trial seeds with multi-screen explainers and constrained axes (no deceptive motion, no reverse entry, numeric clues only, guaranteed decoys) introduce each mechanic without difficulty spikes. A persistent banner marks every trial run; completion unlocks the real daily attempt and is tracked per player.

- Server-Authoritative Scoring: Clients submit raw performance metrics; the server recomputes `normalized_score` (0-100) from scratch and never trusts a client score. Per-family models: continuous (Recall), speed-first (Surge, Strike), logic-first (Cipher, Depths). Scores of 15 or higher count as solved and preserve streaks.

- Daily Leaderboards: Top 50 per category ordered by score desc then elapsed asc, with exact rank computation for players outside the top 50 and daily family index display.

- Yesterday's Review: Per-category community telemetry for the previous UTC day covering player count, average, median, top-1% threshold, and a five-bucket score distribution, plus your rank and percentile if you played.

- Streaks and Milestones: Per-category streaks recomputed by walking consecutive UTC dates backward. Milestones at 7, 30, 100, and 365 days fire rarity-tiered overlays (Rare, Legendary, Mythical, Rainbow) with dedicated sound stings and spoken Arkalon lines, celebrated once per category and milestone.

- Identity and Recovery: Zero-friction anonymous identity provisioned by the Arkalon Network hub via root cookies, with procedural rerollable nicknames. Hub recovery codes are the only cross-device restoration mechanism; a one-time, server-persisted Recovery Tutorial overlay teaches players to save theirs.

- Share Cards: Client-rendered 540x675 result images at 2x scale via html2canvas, handed to the Web Share API with file attachment and desktop download/clipboard fallbacks. Each category tells its attempt through a unique performance strip: glyph accuracy grid, reaction-time bar chart, round check/cross sequence, shot grade letters, and excavation mini-grid.

- Audio and Arkalon Voice: Three independent channels (Sound FX, Music, Arkalon Voice) with per-channel toggles and volumes persisted locally. HTML5 audio pools plus a Web Audio polyphony engine (6 simultaneous voices) cover rapid-tap effects. Context-aware BGM rotates three menu tracks and loops one genre-distinct track per category with 1s crossfades. The browser-native TTS persona (pitch 0.25, rate 0.75, synthetic cadence pauses) delivers the daily welcome, category entries, result verdicts, and milestone proclamations at zero server cost.

- Profile and Progression: Deterministic gradient avatars, identity card with badge chips, Skill Profile bar chart (averages shown at 3+ plays), per-category stats panel (best, average, days played, current and longest streak), and global percentile suppressed below a 25-player population.

- Updates System: A single `UPDATES` array drives a version-stamped Update Modal for returning players and a sortable accordion history page at `/updates`.

- Fair Play and Session Integrity: One attempt per player/date/category enforced by a database unique constraint. BroadcastChannel tab guard pauses gameplay on duplicate tabs; real-time puzzles pause on tab hide and Escape. A blurred PauseOverlay with a 3-2-1 resume countdown excludes paused milliseconds from all timing metrics. Submission rate limiting runs with periodic stale-entry cleanup, and turn-based puzzles resume from localStorage instead of restarting after a refresh.

### Technical Foundation

- Stack: Next.js 16 App Router with Server Actions, Tailwind CSS v4 (CSS-first), Zustand 5 stores, and PostgreSQL 17 via `pg.Pool`.
- Family Registry: One-entry registration per puzzle family (generator, validator, result metrics, scoring model); adding a family costs one registry entry plus one component.
- Deployment: Single Docker container behind shared Caddy on a Hetzner VPS; PostgreSQL in a shared container on a private `db-net` with no public port; daily seed generation via a 00:00 UTC crontab hitting a secret-protected route; CI-gated deploys with automated health probes; daily `pg_dump` backups rotated to Backblaze B2.
- RPS League Visual Language: Galaxy-tier score shaders, animated category frames and buttons, and rarity auras migrated and adapted to Daily's 0-100 scoring curve.