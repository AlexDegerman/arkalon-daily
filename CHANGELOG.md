# Changelog

All notable updates to Arkalon Daily are documented here and surfaced in-app through the Update Modal and the `/updates` page.

## [1.0] - Platform Launch

### Added

* **Five Daily Puzzle Categories:** Launched five optional daily puzzle categories covering Recall, Surge, Cipher, Strike, and Depths, each targeting a distinct cognitive skill: working memory, reflex speed, pattern logic, precision timing, and spatial deduction. One attempt per category per day, resetting at 00:00 UTC.

* **Deterministic Puzzle Engine:** Daily seeds derived from `HMAC-SHA256(secret, "YYYY-MM-DD:category")` and consumed server-side by a mulberry32 seeded PRNG so every player receives the identical challenge without any server-side game tick. Each category ships 15 hand-crafted base configurations with continuous parameter variation (timing +/-12%, windows +/-10%, speed +/-8%), producing 200+ meaningfully distinct daily instances per category.

* **Five Registered Puzzle Families:** Arkalon Vision (Recall), Surge Frenzy (Surge), Wild Prediction (Cipher), Sniper Challenge (Strike), and Crystal Mine (Depths) each register in a single-entry family registry; adding a future family costs one registry entry plus one component with no other structural changes.

* **Compositional Variation and Validation:** Full axis unions per family covering 19 spawn patterns, 10 target behaviors, 8 timing profiles, and 10 spatial layouts for Surge; 7 pattern generators for Cipher; 4 clue types and 8 deposit patterns for Depths; 12-30 shots and 4 reticle motion functions including deceptive feints for Strike; sequence lengths 3-12 with shuffled keypads and optional reverse-entry final rounds for Recall. Per-family validators reject unfair or degenerate combinations and retry with deterministic derived seeds, keeping the accepted challenge identical for all players. Crystal Mine runs a full grid constraint-elimination solvability proof before accepting any Depths challenge.

* **First-Contact Trials:** Fixed trial seeds with multi-screen explainers and constrained axes (no deceptive motion, no reverse entry, numeric clues only, guaranteed decoys where the explainer teaches them) introduce each mechanic without difficulty spikes. A persistent amber banner marks every trial run; completion unlocks the real daily attempt and is tracked per player per category.

* **Server-Authoritative Scoring:** Clients submit raw performance metrics; the server recomputes `normalized_score` (0-100) from scratch and never trusts a client score. Per-family scoring models: continuous weighted (Recall), speed-first with combo multipliers (Surge), speed-first with deviation grading (Strike), accuracy-plus-efficiency (Cipher), discovery-plus-efficiency (Depths). Scores of 15 or higher count as a solve and preserve streaks.

* **Daily Leaderboards:** Top 50 per category ordered by score descending then elapsed ascending, with exact rank computation for players outside the top 50 and a daily family index display. Board rows cached server-side for 45 seconds to reduce database load under concurrent requests.

* **Weekly and All-Time Leaderboard Tiers:** Aggregate-score rankings gated by minimum-match thresholds, surfacing average score, clears, best score, total points, and streak columns per row, with a TOTAL cross-category view combining all five disciplines.

* **Yesterday's Review:** Per-category community telemetry for the previous UTC day covering player count, average score, median, top-1% threshold, and a five-bucket score distribution, plus your rank and percentile if you played. Suppressed below a 25-player population minimum to avoid noise on low-traffic categories.

* **Streaks and Milestones:** Per-category streaks recomputed by walking consecutive UTC dates backward from the latest result, making them immune to missed writes or increment bugs. Milestones at 7, 30, 100, and 365 days fire rarity-tiered overlay animations (Rare, Legendary, Mythical, Rainbow) with dedicated sound stings and spoken Arkalon proclamations, celebrated once per category per milestone.

* **Identity and Recovery:** Zero-friction anonymous identity provisioned by the Arkalon Network hub via root cookies, with procedurally generated rerollable nicknames. Hub recovery codes are the only cross-device restoration mechanism; a one-time server-persisted Recovery Tutorial overlay teaches players to save their code before their first streak is at risk.

* **Share Cards:** Client-rendered 540x675 result images at 2x scale via html2canvas, handed to the Web Share API with file attachment and desktop download/clipboard fallbacks. Each category communicates its attempt through a unique performance strip: glyph accuracy grid (Recall), color-graded reaction-time bar chart (Surge), round check/cross sequence (Cipher), shot grade letters P/E/G/L/diamond (Strike), and crystal excavation mini-grid (Depths). Score numbers render as solid tier-matched colors to work around html2canvas limitations with gradient text fills.

* **Audio and Arkalon Voice:** Three independent channels (Sound FX, Music, Arkalon Voice) with per-channel toggles and volumes persisted locally. HTML5 audio pools (3-deep per effect) cover standard sounds; a Web Audio polyphony engine (6 simultaneous voices with voice stealing) handles burst tap rates during Surge and Depths that pool playback cannot sustain. Context-aware BGM rotates three menu tracks and loops one genre-distinct track per category with 1-second crossfades: IDM (Cipher), dub-techno (Depths), memory piano (Recall), percussion (Strike), DnB (Surge). Arkalon Voice speaks via browser-native Web Speech API at pitch 0.25 and rate 0.75 with synthetic cadence pauses, delivering the daily welcome, category entries, result verdicts, and milestone proclamations at zero server cost.

* **Profile and Progression:** Deterministic gradient avatars (FNV-hash hues, nickname initials), identity card with badge chips (puzzles played, active streaks, trial progress), Skill Profile bar chart of per-category averages shown at 3+ plays, and per-category stats panels covering best score, average, days played, current streak, longest streak, and global percentile suppressed below a 25-player population.

* **Updates System:** A single `UPDATES` array drives a version-stamped Update Modal for returning players and a sortable accordion history page at `/updates`. New players see the Welcome Modal instead.

* **Fair Play and Session Integrity:** One attempt per player/date/category enforced by a database unique constraint. BroadcastChannel tab guard pauses gameplay on duplicate tabs; real-time puzzles pause on tab hide and Escape. A blurred PauseOverlay with a 3-2-1 resume countdown excludes paused milliseconds from all timing metrics. Submission rate limiting at 5 per minute per player with periodic stale-entry cleanup. Turn-based puzzles (Recall, Cipher, Depths) persist mid-session progress in localStorage so a page refresh resumes rather than restarts.

* **Mobile and PWA Experience:** Installable as a Progressive Web App on iOS 14+, Android 9+, and desktop (Chrome, Edge, Brave). Responsive from 320px minimum viewport to ultra-wide 1152px+ with a 50/50 Mission Control split layout. Touch and keyboard controls are equally first-class; Arkalon Voice and Web Audio degrade cleanly on restricted browsers.

### Technical Foundation

* **Stack:** Next.js 16 App Router with Server Actions, Tailwind CSS v4 (CSS-first), Zustand 5 stores (`puzzleStore`, `uiStore`, `musicStore`), PostgreSQL 17 via `pg.Pool`, and Zod for all Server Action input validation.

* **Family Registry:** One-entry registration per puzzle family (generator, validator, result metrics, scoring model); adding a new family costs one registry entry plus one component.

* **Deployment:** Single Docker container behind shared Caddy on a Hetzner VPS; PostgreSQL in a shared container on a private `db-net` with no public port owning its isolated `arkalon_daily` database. Daily seed generation via a 00:00 UTC crontab hitting a secret-protected route; CI-gated deploys with automated health probes via GitHub Actions; daily `pg_dump` backups rotated to Backblaze B2.

* **Arkalon Visual Language:** Galaxy-tier score shaders, animated category frames and result borders, and rarity aura effects adapted from RPS League to Arkalon Daily's 0-100 scoring curve.