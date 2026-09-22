# Arkalon Daily

A browser-based daily puzzle platform offering five optional daily puzzles, each targeting a distinct cognitive skill. Every player who opens a category on the same day receives the identical seeded challenge. One attempt per category per day. Resets at 00:00 UTC. Come back tomorrow.

**Play Here:** [https://daily.rpsleague.fi](https://daily.rpsleague.fi)

> **Development Status:** Arkalon Daily is live in production and fully operational. The platform launched with its complete feature set: five puzzle categories, deterministic challenge generation, server-authoritative scoring, leaderboards, streaks, identity, share cards, and audio systems all in place. Active development continues with additional puzzle families, expanded leaderboard tiers, and deeper Arkalon Network integration on the roadmap.

> **Part of the Arkalon Network:** Arkalon Daily is one application in the wider [Arkalon universe](https://network.rpsleague.fi/), a multi-app ecosystem sharing a common identity layer, visual language, and cross-app recommendation surface.

<!-- TODO(record): ./assets/preview_showcase.gif
<p align="center">
  <strong>Arkalon Daily - Five Puzzles Showcase</strong><br/>
  <img src="./assets/preview_showcase.gif" width="420" />
</p>
-->

---

## Table of Contents

### Puzzles
- [The Five Puzzles](#the-five-puzzles)
- [Deterministic Puzzle Engine](#deterministic-puzzle-engine)
- [Scoring & Streaks](#scoring--streaks)
- [Trials & Onboarding](#trials--onboarding)

### Social & Progression
- [Leaderboards & Yesterday's Review](#leaderboards--yesterdays-review)
- [Profile & Progression](#profile--progression)
- [Share Cards](#share-cards)

### Platform
- [Identity & Recovery](#identity--recovery)
- [Audio & Arkalon Voice](#audio--arkalon-voice)
- [Updates System](#updates-system)
- [Fair Play & Session Integrity](#fair-play--session-integrity)
- [Mobile & PWA Experience](#mobile--pwa-experience)

### Engineering
- [Architecture](#architecture)
- [Design Decisions](#design-decisions)
- [Technical Challenges & Solutions](#technical-challenges--solutions)
- [CI/CD & Infrastructure](#cicd--infrastructure)
- [Tests](#tests)

### Meta
- [Future Improvements](#future-improvements)
- [Changelog](#changelog)
- [Device Compatibility](#device-compatibility)
- [Disclaimer](#disclaimer)
- [Privacy](#privacy)
- [License](#license)

---

## The Five Puzzles

| Category | Core Skill |
|---|---|
| **Recall** | Working memory, sequence retention |
| **Surge** | Rapid reflex to changing stimuli |
| **Cipher** | Pattern reasoning and rule discovery |
| **Strike** | Controlled timing accuracy |
| **Depths** | Spatial deduction and grid logic |

Each category maps to a registered puzzle family via a one-entry family registry. Adding a new family costs one registry entry plus one component with no other changes required.

### Recall
Watch glyph sequences light up across a 16-symbol pool, then reproduce them from a shuffled keypad across three escalating rounds. Composition axes: sequence lengths 3-12, per-glyph display 500-1000ms, glyph pools 8-16, shuffled keypad layouts, and reverse-entry final rounds.

<!-- TODO(record): ./assets/recall_showcase.gif
<p align="center">
  <strong>Recall in Action</strong><br/>
  <img src="./assets/recall_showcase.gif" width="220" />
</p>
-->

### Surge
A 60-second survival arena (45s or 90s on specific timing profiles) where energy nodes spawn, decay, and must be tapped before expiry, while red decoy nodes punish careless inputs. Combos multiply node value. Composition axes: 19 spawn patterns, 10 target behaviors, 8 timing profiles, 10 spatial layouts.

<!-- TODO(record): ./assets/surge_showcase.gif
<p align="center">
  <strong>Surge in Action</strong><br/>
  <img src="./assets/surge_showcase.gif" width="220" />
</p>
-->

### Cipher
Study element sequences and select the correct continuation. Seven pattern generators span alternating and multi-variable cycles, rule discovery through yes/no example sets, and timed constrained-choice rounds with explicit constraint lists.

<!-- TODO(record): ./assets/cipher_showcase.gif
<p align="center">
  <strong>Cipher in Action</strong><br/>
  <img src="./assets/cipher_showcase.gif" width="220" />
</p>
-->

### Strike
Fire when a moving reticle crosses the target zone on a 600-unit track. Shots grade from PERFECT (under 5px deviation) to MISS. Composition axes: 12-30 shots, target windows 30-80px, four motion functions including linear, sinusoidal, erratic, and a deceptive fake-decelerate feint.

<!-- TODO(record): ./assets/strike_showcase.gif
<p align="center">
  <strong>Strike in Action</strong><br/>
  <img src="./assets/strike_showcase.gif" width="220" />
</p>
-->

### Depths
Excavate a 5-7 grid with a limited charge budget to uncover hidden crystal deposits. Four clue types (numeric distance, directional arrows, hot/cold bands, adjacency counts) and eight deposit patterns drive pure deduction. Mark suspect tiles without spending charges; a full solvability proof is run server-side before a challenge is accepted.

<!-- TODO(record): ./assets/depths_showcase.gif
<p align="center">
  <strong>Depths in Action</strong><br/>
  <img src="./assets/depths_showcase.gif" width="220" />
</p>
-->

---

## Deterministic Puzzle Engine

The core engineering challenge: identical challenges for every player, fairly, without any server-side game tick.

- **Daily seeds** derive from `HMAC-SHA256(secret, "YYYY-MM-DD:category")` and are consumed server-side by `mulberry32`, a seeded PRNG. The raw seed never reaches the client.
- **Base configurations**: each category ships 15 hand-crafted base configurations. Continuous-parameter variation (timing +/-12%, windows +/-10%, speed +/-8%) produces 200+ meaningfully distinct daily instances per category.
- **Validation and retry**: every generated challenge passes a per-family validator before acceptance. Rejections re-seed with a deterministic counter prefix, so the accepted instance is identical for all players regardless of how many attempts were needed.
- **Seed persistence**: a VPS crontab at 00:00 UTC hits a secret-protected route to persist the day's `daily_puzzles` rows before the first player arrives.

Validator highlights per family: Recall enforces a 450ms per-glyph display floor and pool containment. Surge caps decoy ratio at 40% and rejects pressure+splitting combos. Strike rejects deceptive motion at 2.5x+ speed with windows under 25px. Depths runs a full clue-elimination solvability proof and rejects degenerate hot/cold coverage. Cipher guarantees the correct answer appears in the choices and rejects monotone generator runs.

---

## Scoring & Streaks

All scoring is server-authoritative. Clients submit raw performance metrics; the server recomputes `normalized_score` (0-100) from scratch. No client score is trusted.

| Puzzle | Model | Formula |
|---|---|---|
| Recall | Continuous | Sum of round weights [35/30/35] x accuracy x speed multiplier (0.5-1.0) |
| Surge | Speed-first | Sum of (100/expectedNodes) x reaction grade x combo multiplier minus 2.0 per decoy hit |
| Strike | Speed-first | Sum of (100/shots) x deviation grade (1.0 / 0.8 / 0.55 / 0.25 / 0) |
| Cipher | Logic-first | accuracy x 80 + 20 x error-efficiency bonus |
| Depths | Logic-first | discovery x 80 + 20 x charge-efficiency bonus |

Scores are mapped to a rarity tier (Common through Rainbow) that drives result frame styling and badge colors. A score of 15 or higher (`STREAK_MIN_SCORE`) counts as a solve and preserves a streak; lower scores or missing days break it.

**Streaks** recompute by walking consecutive UTC dates backward from the latest result. This makes streaks immune to missed writes and incrementing bugs. Milestones at 7, 30, 100, and 365 days fire rarity-tiered overlay animations (Rare, Legendary, Mythical, Rainbow) with dedicated sound stings and spoken Arkalon proclamations, celebrated once per category per milestone.

---

## Trials & Onboarding

First contact with each category opens a Trial: a multi-screen explainer followed by a seeded practice run on fixed trial seeds with constrained axes (no deceptive motion, no reverse entry, numeric clues only, guaranteed decoys where the explainer teaches them). A persistent amber banner makes clear the run never counts toward a streak or leaderboard. Completing the trial unlocks the real daily attempt; skipping is always allowed. New visitors meet the Welcome Modal (identity card, nickname reroll, five-puzzle showcase) instead of going straight to a trial.

---

## Leaderboards & Yesterday's Review

- **Daily boards**: top 50 per category ordered by score descending, then elapsed ascending. Exact rank is computed for players outside the top 50. A daily family index displays alongside each entry.
- **Weekly and All-Time tiers**: aggregate-score rankings gated by minimum-match thresholds, surfacing average score, clears, best, total points, and streak columns per row, with a TOTAL cross-category view combining all five disciplines.
- **Yesterday's Review**: per-category community telemetry covering player count, average score, median, top-1% threshold, and a five-bucket score distribution, plus your rank and percentile if you played. Results are shown at a 25-player population minimum to avoid noise.
- **Leaderboard caching**: player-agnostic board rows are cached server-side for 45 seconds to reduce database load under concurrent requests.

---

## Profile & Progression

Each profile surfaces deterministic visual identity and per-category performance data:

- **Deterministic avatar**: FNV-hash gradient hues derived from the player ID with nickname initials overlaid, producing a unique visual identity without any stored image.
- **Identity card**: badge chips showing puzzles played, active streaks per category, and trial completion progress.
- **Skill Profile**: a bar chart of per-category score averages, shown once the player has 3+ plays in a category.
- **Per-category stats panel**: best score, average score, days played, current streak, longest streak, and global percentile (suppressed below a 25-player population).

---

## Share Cards

Result cards render entirely client-side: `html2canvas` captures an offscreen 540x675 card at 2x scale into a PNG, handed to the Web Share API with file attachment. Desktop falls back to download plus clipboard text; any further failure falls back to text-only share. Animations and background images are stripped in the cloned document and hard timeouts guard both render and blob stages. Each category tells its attempt through a unique performance strip:

| Category | Strip |
|---|---|
| Recall | Per-round glyph accuracy grid (green/red cells) |
| Surge | Reaction-time bar chart, color-graded, misses flattened to zero |
| Cipher | Per-round check or cross sequence |
| Strike | Shot grade letters (P / E / G / L / diamond) |
| Depths | Mini excavation grid with discovered crystal positions |

Score numbers render in solid tier-matched colors rather than gradient fills, working around an `html2canvas` limitation with `background-clip: text`.

---

## Identity & Recovery

No accounts, no email, no passwords. Identity is provisioned by the Arkalon Network hub as an anonymous core UUID shared across the ecosystem via root cookies. Nicknames are procedurally generated and rerollable at any time.

The hub's human-readable recovery code is the only cross-device restoration mechanism. A one-time Recovery Tutorial overlay (server-persisted so it fires exactly once) teaches players to save their code before their first streak is at risk.

---

## Audio & Arkalon Voice

Three independent channels, each with its own toggle and volume control, persisted in localStorage:

- **Sound FX**: HTML5 audio pools (3-deep per effect) cover most sounds. Rapid-tap effects during Surge and Depths run through a Web Audio polyphony engine (6 simultaneous voices with voice stealing) to handle burst tap rates that pool playback cannot keep up with.
- **Background Music**: context-aware BGM rotates three menu tracks and loops one genre-distinct track per category (IDM for Cipher, dub-techno for Depths, memory piano for Recall, percussion for Strike, DnB for Surge), crossfaded over 1 second.
- **Arkalon Voice**: browser-native Web Speech API at pitch 0.25 and rate 0.75, with synthetic cadence pauses inserted between words and punctuation boundaries. Delivers the daily welcome, category entries, result verdicts, and milestone proclamations at zero server cost. Voice primed on application mount with refresh-on-speak logic for asynchronous browser voice loading. A cooldown prevents collisions with simultaneous sound effects.

---

## Updates System

A single `UPDATES` array in `src/lib/updates.ts` is the source of truth for all release history. Returning players whose acknowledged version stamp lags behind the latest receive the Update Modal on load; new players get the Welcome Modal instead. The `/updates` page renders the full history as a sortable accordion (newest or oldest first) with the latest entry highlighted.

---

## Fair Play & Session Integrity

- **One attempt per player/date/category**, enforced by a database unique constraint. Duplicate submissions reject cleanly with a clear error.
- **Tab guard**: BroadcastChannel detects duplicate tabs and pauses active gameplay; real-time puzzles (Surge, Strike) also pause on tab hide and on Escape.
- **Pause overlay**: blurs the play surface so no state can be studied while paused. Resumes through a 3-2-1 countdown; paused milliseconds are excluded from all timing metrics.
- **Submission rate limiting**: 5 submissions per minute per player, with periodic stale-entry cleanup.
- **Mid-session persistence**: turn-based puzzles (Recall, Cipher, Depths) resume exact progress to prevent reset exploits, while real-time puzzles (Surge, Strike) track against wall-clock time so refreshing cannot be used to restart timers or dodge shots.

---

## Mobile & PWA Experience

- **Progressive Web App**: installable directly from modern browsers on mobile (iOS Safari via Add to Home Screen, Android Chrome via Install prompt) and desktop (Chrome, Edge, Brave) to launch in a standalone, borderless window with custom icons.
- **Ultra-compact viewport resilience (320px)**: the mobile layout scales down to 320px viewports with zero horizontal overflow, dynamic text scaling on category titles, touch-padded hitboxes, and an integrated bottom telemetry bar. Includes an adaptive, high-density leaderboard that surfaces inline sub-row telemetry on mobile with zero nickname truncation, expanding cleanly into dedicated multi-column table layouts on wider viewports.
- **Adaptive wide-screen layout**: scales from tablet through desktop to ultra-wide (1152px+), transforming into a 50/50 split pairing the interactive puzzle rack with a Mission Control telemetry suite showing the live UTC countdown clock, daily clearance pips, and discipline breakdown.
- **Input parity**: touch and keyboard controls are first-class citizens (Space/Enter to fire or select, Escape to pause, focusable glyph keypad buttons).

---

## Architecture

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (Server Actions) |
| Styling | Tailwind CSS v4 (CSS-first, Arkalon tier shaders) |
| Client Platform | Progressive Web App (standalone manifest) |
| State | Zustand 5 (`puzzleStore`, `uiStore`, `musicStore`) |
| Database | PostgreSQL 17 via `pg.Pool` |
| Seed generation | HMAC-SHA256 + mulberry32 seeded PRNG |
| Input validation | Zod schemas on all Server Action inputs |
| Share cards | html2canvas + Web Share API |
| Deployment | Docker on Hetzner VPS, Caddy reverse proxy |

```
graph LR
    Cron[VPS Crontab 00:00 UTC] -->|CRON_SECRET| API[/api/cron/generate-daily/]
    User([Player Browser]) -->|UI / Zustand| Next[Next.js Frontend]
    Next -->|Server Actions| SA[Seed Gen / Scoring / Streaks]
    SA -->|SQL| DB[(PostgreSQL arkalon_daily)]
    Next -->|Identity provisioning| Hub[Arkalon Network Hub]
```

---

## Design Decisions

- **Zero-friction identity**: anonymous ecosystem-wide core ID over local accounts; recovery code over passwords. Players are in the puzzle loop within seconds of first visit.
- **Server-authoritative everything**: seeds, scores, streaks, and ranks never trust the client. Raw metrics are submitted; the server recomputes the score entirely.
- **Determinism over ticks**: HMAC + seeded PRNG replaces a live challenge generator, delivering fairness without sustained server load. Every player's challenge is the same.
- **Optional by design**: five optional puzzles framed as daily extension, never obligation. Continuation panels invite rather than guilt; missing a day is a broken streak, not a punishment.
- **Pause over penalty**: interruptions pause real-time puzzles instead of punishing them. The pause overlay blurs state so pausing cannot be exploited.
- **Client-side spectacle at zero server cost**: share cards, Arkalon Voice TTS, and result animations cost the server nothing.
- **One-entry family registry**: adding a new puzzle family to any category costs one registry line and one component, making the system composable without structural changes.

---

## Technical Challenges & Solutions

**Deterministic validation retries**
Rejected seeds re-derive with counter prefixes (`attempt.toString(16) + baseSeed.slice(2)`) so every player independently converges on the same accepted challenge. Up to 20 retry attempts are made before a hard error is thrown.

**High-frequency tap audio under Surge tap rates**
Standard HTML5 audio pools clip under burst tap rates during Surge. Solved by decoding audio buffers into Web Audio API nodes with 6-voice polyphony and voice stealing, maintaining clean sound at maximum tap speed.

**html2canvas stability for share cards**
Animations, background gradients, and `background-clip: text` fills break in the html2canvas cloned document. The clone strips these before capture and hard timeouts guard both the render and blob conversion stages, preventing hung share attempts on slow devices.

**Frame-perfect real-time rendering without React re-renders**
Strike's reticle and Surge's node positions are driven directly from a `requestAnimationFrame` loop through DOM refs, keeping React entirely out of the 60fps render path. State changes that need React (score updates, completion) are batched and applied on round completion rather than per frame.

**Streak truthfulness**
Streaks recompute from the full result history by walking consecutive UTC dates backward on every submission, rather than trusting incremental updates. This makes streaks immune to missed writes, race conditions, and clock drift.

**Depths solvability proof**
A grid-constraint elimination pass runs server-side before any Depths challenge is accepted. It applies every clue's elimination rules, counts remaining possible tiles, and rejects any challenge where deposits cannot be found within the charge budget.

---

## CI/CD & Infrastructure

CI gates every push with a TypeScript type check and full production build (using dummy build-time environment variables). Deploys SCP source to the VPS, rebuild the Docker image tagged with the commit SHA, recreate the container, and verify via an automated health probe. The app runs as a single Docker container behind shared Caddy on a Hetzner VPS.

| Stage | Tool | Purpose |
|---|---|---|
| Testing | TypeScript + Next.js Production Build | Type checking and production build verification |
| Deployment | GitHub Actions to Hetzner VPS | CI gate, SCP sync, Docker rebuild, health probe |
| Infrastructure | Docker, Caddy, PostgreSQL 17 | Single container, automatic TLS, private db-net |
| Seed generation | VPS crontab at 00:00 UTC | Secret-protected route persists daily_puzzles rows |
| Backups | pg_dump + Backblaze B2 rotation | Daily ecosystem-wide database backup |

PostgreSQL lives in a shared container on a private `db-net` with no public port, owns its isolated `arkalon_daily` database, and is covered by the ecosystem's daily `pg_dump` plus Backblaze B2 backup rotation.

### Key Workflows

- `ci.yml` runs type check and production build on all pushes and pull requests.
- `deploy.yml` deploys to the Hetzner VPS after CI passes, rebuilds Docker with the commit SHA as the image tag, recreates the container, and verifies health via `node -e fetch(...)`.

---

## Tests

Comprehensive Vitest coverage across the deterministic puzzle engine, server-authoritative scoring and enforcement, leaderboard math, and client session flow.

👉 [View full Test Suite Documentation →](./tests.md)

---

## Future Improvements

- **Additional puzzle families per category**: each category's one-entry family registry supports multiple families. New families can be registered without structural changes.
- **Weekly and All-Time leaderboard completion**: currently implemented in the data layer; the leaderboard UI surface for these tiers is in progress.
- **Deeper Arkalon Network integration**: cross-app surfaces on the Arkalon Network hub, shared achievement visibility, and expanded cross-app recommendations beyond the current single-entry pool.
- **Expanded BGM and spectacle coverage**: additional milestone tiers, category-specific result animations, and audio coverage for streak events.

---

## Changelog

All notable updates to Arkalon Daily are documented in the project changelog and surfaced in-app through the Update Modal and the `/updates` page.

> 👉 [View full changelog →](./CHANGELOG.md)

---

## Device Compatibility

- **Progressive Web App (PWA)**: installable on iOS 14+ (Safari, Add to Home Screen), Android 9+ (Chrome, Install prompt), and desktop (Chrome, Edge, Brave).
- **Supported browsers**: Chrome, Firefox, Safari, Edge (modern versions). Graceful audio degradation on browsers with restricted AudioContext autoplay or speech synthesis policies.
- **Minimum viewport**: 320px with full layout integrity, zero horizontal overflow, and touch-padded hitboxes.
- **Not supported**: Internet Explorer and browsers without Web Audio API support.

---

## Disclaimer

Arkalon Daily is a skill-tracking game experience. Scores, streaks, and rankings are purely recreational and hold no monetary value. Challenges reset daily at 00:00 UTC; missed days cannot be replayed.

---

## Privacy

No emails, passwords, or personally identifiable information are collected or stored. Identity is an anonymous ecosystem UUID provisioned by the Arkalon Network hub. Sound preferences and version acknowledgements live only in browser localStorage. Server logs never contain personally identifiable information.

---

## License

Copyright (c) 2026 Alex Degerman. All Rights Reserved.

Arkalon Daily and all associated source code, assets, systems, and files are proprietary. Unauthorized copying, modification, distribution, public hosting, sublicensing, or use of this software, in whole or in part, is strictly prohibited without prior written permission from the copyright holder.

---

*Part of the [Arkalon Network](https://network.rpsleague.fi)*