# Arkalon Daily

A browser-based daily puzzle platform offering five optional daily puzzles, each targeting a distinct cognitive skill. Every player who opens a category on the same day receives the identical seeded challenge. One attempt per category per day. Resets at 00:00 UTC. Come back tomorrow.

> **Play Here:** https://daily.rpsleague.fi

<!-- TODO(record): ./assets/preview_showcase.gif
<p align="center">
  <strong>Arkalon Daily - Five Puzzles Showcase</strong><br/>
  <img src="./assets/preview_showcase.gif" width="420" />
</p>
-->

---

## Table of Contents

- [The Five Puzzles](#the-five-puzzles)
- [Deterministic Puzzle Engine](#deterministic-puzzle-engine)
- [Scoring & Streaks](#scoring--streaks)
- [Trials & Onboarding](#trials--onboarding)
- [Leaderboards & Yesterday's Review](#leaderboards--yesterdays-review)
- [Identity & Recovery](#identity--recovery)
- [Share Cards](#share-cards)
- [Audio & Arkalon Voice](#audio--arkalon-voice)
- [Profile & Progression](#profile--progression)
- [Updates System](#updates-system)
- [Fair Play & Session Integrity](#fair-play--session-integrity)
- [Architecture](#architecture)
- [Design Decisions](#design-decisions)
- [Technical Challenges & Solutions](#technical-challenges--solutions)
- [CI/CD & Infrastructure](#cicd--infrastructure)
- [Future Improvements](#future-improvements)
- [Device Compatibility](#device-compatibility)
- [Disclaimer](#disclaimer)
- [Privacy](#privacy)
- [License](#license)

---

## The Five Puzzles

| Category | Core Skill |
|---|---|
| **Recall** | Working memory, sequence retention |
| **Surge** | Rapid reaction to changing stimuli |
| **Cipher** | Pattern reasoning and rule discovery |
| **Strike** | Controlled timing accuracy |
| **Depths** | Spatial deduction and grid logic |

### Recall
Watch glyph sequences light up, then reproduce them from a 16-glyph keypad across three escalating rounds. Composition axes: sequence lengths 3-12, per-glyph display 500-1000ms, glyph pools 8-16, shuffled keypad layouts, and reverse-entry final rounds.

<!-- TODO(record): ./assets/recall_showcase.gif
<p align="center">
  <strong>Recall in Action</strong><br/>
  <img src="./assets/recall_showcase.gif" width="220" />
</p>
-->

### Surge
A 60-second survival arena (45s or 90s on specific timing profiles) where energy nodes spawn, decay, and must be tapped before expiry - while red decoy nodes punish careless hands. Combos multiply node value. Composition axes: 19 spawn patterns, 10 target behaviors, 8 timing profiles, 10 spatial layouts.

<!-- TODO(record): ./assets/surge_showcase.gif
<p align="center">
  <strong>Surge in Action</strong><br/>
  <img src="./assets/surge_showcase.gif" width="220" />
</p>
-->

### Cipher
Study element sequences and select the correct continuation. Seven pattern generators span alternating and multi-variable cycles, rule discovery (yes/no example sets), and timed constrained-choice rounds with explicit constraint lists.

<!-- TODO(record): ./assets/cipher_showcase.gif
<p align="center">
  <strong>Cipher in Action</strong><br/>
  <img src="./assets/cipher_showcase.gif" width="220" />
</p>
-->

### Strike
Fire when a moving reticle crosses the target zone on a 600-unit track. Shots grade from PERFECT (under 5px) to MISS. Composition axes: 12-30 shots, target windows 30-80px, four motion functions including linear, sinusoidal, erratic, and deceptive fake-decelerate feints.

<!-- TODO(record): ./assets/strike_showcase.gif
<p align="center">
  <strong>Strike in Action</strong><br/>
  <img src="./assets/strike_showcase.gif" width="220" />
</p>
-->

### Depths
Excavate a 5-7 grid with a limited charge budget to uncover hidden crystal deposits. Clue tiles (numeric distance, directional arrows, hot/cold bands, adjacency counts) plus eight deposit patterns drive pure deduction. Right-click or hold to mark suspect tiles without spending charges.

<!-- TODO(record): ./assets/depths_showcase.gif
<p align="center">
  <strong>Depths in Action</strong><br/>
  <img src="./assets/depths_showcase.gif" width="220" />
</p>
-->

---

## Deterministic Puzzle Engine

The core engineering challenge: identical challenges for every player, fairly, without any server-side game tick.

- Daily seeds derive from `HMAC-SHA256(secret, "YYYY-MM-DD:category")` and are consumed server-side by `mulberry32`, a seeded PRNG. The seed never reaches the client.
- Each category has 15 hand-crafted base configurations; continuous-parameter variation (timing +/-12%, windows +/-10%, speed +/-8%) produces 200+ meaningfully distinct daily instances per category.
- Every generated challenge passes a family validator before acceptance. Rejections re-seed with a deterministic counter prefix, so the accepted instance is identical for all players.
- A VPS crontab at 00:00 UTC hits a secret-protected route to persist the day's `daily_puzzles` rows.

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

Streaks: a day counts only at score 15 or higher (`STREAK_MIN_SCORE`); failed or missing days break the chain. Streaks recompute by walking consecutive UTC dates backward. Milestones at 7, 30, 100, and 365 days fire rarity-tiered overlays (Rare, Legendary, Mythical, Rainbow) with dedicated sound stings and spoken Arkalon lines, celebrated once per category and milestone.

---

## Trials & Onboarding

First contact with each category opens a Trial: a multi-screen explainer followed by a seeded practice run on fixed trial seeds with constrained axes (no deceptive motion, no reverse entry, numeric clues only, guaranteed decoys where the explainer teaches them). A persistent amber banner makes clear the run never counts. Completing it unlocks the real daily attempt; skipping is always allowed. New visitors meet the Welcome Modal (identity card, nickname reroll, five-puzzle showcase) instead.

---

## Leaderboards & Yesterday's Review

- Daily boards: top 50 per category ordered by score desc, elapsed asc, with the current player's exact rank computed when outside the top 50.
- Weekly and All-Time tiers (in development): average-score rankings gated by minimum-match thresholds, surfacing clears, best, points, and streak columns per row, with a TOTAL cross-category view.
- Yesterday's Review: per-category community telemetry covering player count, average, median, top-1% threshold, and a five-bucket score distribution, plus your rank and percentile if you played.

---

## Identity & Recovery

No accounts, no email, no OAuth. Identity is provisioned by the Arkalon Network hub as an anonymous core UUID shared across the ecosystem via root cookies. A human-readable recovery code on the hub is the only restoration mechanism across devices; nicknames are procedural and rerollable. A one-time Recovery Tutorial overlay (server-persisted) teaches players to save their code before their first streak is at risk.

---

## Share Cards

Result cards render entirely client-side: `html2canvas` captures an offscreen 540x675 card at 2x scale into a PNG, handed to the Web Share API with file attachment. Desktop falls back to download plus clipboard text; failure falls back to text-only share. Each category tells its attempt through a unique performance strip:

| Category | Strip |
|---|---|
| Recall | Per-round glyph accuracy grid (green/red cells) |
| Surge | Reaction-time bar chart, color-graded, misses flattened |
| Cipher | Per-round check or cross sequence |
| Strike | Shot grade letters (P / E / G / L / diamond) |
| Depths | Mini excavation grid with discovered gem positions |

---

## Audio & Arkalon Voice

Three independent channels (Sound FX, Music, Arkalon Voice), each with its own toggle and volume, persisted locally. Rapid-tap effects (Surge nodes, Depths crystals) run through a Web Audio polyphony engine (6 simultaneous voices) while everything else uses 3-deep HTML5 audio pools. BGM is context-aware: three rotating menu tracks and one looping genre-distinct track per category, crossfaded over 1s. Arkalon Voice speaks via the browser-native Web Speech API at pitch 0.25 and rate 0.75, with synthetic cadence pauses, delivering the daily welcome, category entries, result verdicts, and milestone proclamations with zero server cost.

---

## Profile & Progression

Deterministic avatar (FNV-hash gradient hues, nickname initials), identity card with badge chips (puzzles played, active streaks, trial progress), a Skill Profile bar chart of per-category averages (shown at 3+ plays), and a per-category stats panel: best score, average, days played, current and longest streak, and global percentile (suppressed below a 25-player population to avoid noise).

---

## Updates System

A single `UPDATES` array is the source of truth. Returning players whose acknowledged version stamp lags get the Update Modal on load; new players get the Welcome Modal instead. The `/updates` page renders the full history as a sortable accordion with a highlighted latest entry.

---

## Fair Play & Session Integrity

- One attempt per player/date/category, enforced by a database unique constraint. Duplicate submissions reject cleanly.
- Tab guard: BroadcastChannel detects duplicate tabs and pauses active gameplay; real-time puzzles (Surge, Strike) also pause on tab hide and on Escape.
- Pause overlay blurs the play surface (no state study while paused) and resumes through a 3-2-1 countdown; paused milliseconds are excluded from all timing metrics.
- Submission rate limiting (5 per minute per player) with periodic stale-entry cleanup.
- Turn-based puzzles (Recall, Cipher, Depths) persist mid-session progress locally so a refresh resumes, never restarts.

---

## Architecture

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (Server Actions) |
| Styling | Tailwind CSS v4 (CSS-first, RPS League tier shaders) |
| State | Zustand 5 (`puzzleStore`, `uiStore`, `musicStore`) |
| Database | PostgreSQL 17 via `pg.Pool` |
| Seed generation | HMAC-SHA256 + mulberry32 PRNG |
| Share cards | html2canvas + Web Share API |
| Deployment | Docker on Hetzner VPS, Caddy reverse proxy |

```
graph LR
    Cron[VPS Crontab 00:00 UTC] -->|CRON_SECRET| API[/api/cron/generate-daily/]
    User([Player Browser]) -->|UI / Zustand| Next[Next.js Frontend]
    Next -->|Server Actions| SA[Seed Gen / Scoring / Streaks]
    SA -->|SQL| DB[(PostgreSQL - arkalon_daily)]
    Next -->|Identity provisioning| Hub[Arkalon Network Hub]
```

---

## Design Decisions

- Zero-friction identity: anonymous ecosystem-wide core ID over local accounts; recovery code over passwords.
- Server-authoritative everything: seeds, scores, streaks, and ranks never trust the client.
- Determinism over ticks: HMAC + seeded PRNG replaces a live match generator, delivering fairness without sustained server load.
- Optional by design: five optional puzzles framed as extension, never obligation; continuation panels invite, never guilt.
- Pause over penalty: interruptions pause real-time puzzles instead of punishing them.
- Client-side spectacle: share cards and TTS cost the server nothing.

---

## Technical Challenges & Solutions

- Deterministic validation retries: rejected seeds re-derive with counter prefixes so every player converges on the same accepted challenge.
- High-frequency tap audio: HTML5 audio pooling clips under Surge tap rates; solved with a decoded-buffer Web Audio polyphony engine with voice stealing.
- html2canvas stability: animations and background images are stripped in the cloned document and hard timeouts guard both render and blob stages.
- Frame-perfect reticle without re-renders: Strike and Surge drive DOM nodes directly from a rAF loop with refs, keeping React out of the 60fps path.
- Streak truthfulness: streaks recompute from the full result history on every submission instead of trusting increments, making them immune to missed writes.

---

## CI/CD & Infrastructure

CI gates every push (type check plus production build with dummy build-time env). Deploys SCP source to the VPS, rebuild the Docker image tagged with the commit SHA, recreate the container, and verify via a health probe. The app runs as a single container behind shared Caddy; PostgreSQL lives in a shared container on a private `db-net` with no public port, owns its isolated database, and is covered by the ecosystem's daily `pg_dump` plus Backblaze B2 backup rotation.

---

## Future Improvements

- Weekly and All-Time leaderboard tiers with minimum-match thresholds and multi-stat rows.
- Additional puzzle families per category through the one-entry family registry.
- Deeper cross-app integration surfaces on the Arkalon Network hub.
- Expanded BGM and spectacle coverage for milestone tiers.

---

## Device Compatibility

- Supported: modern mobile and desktop browsers (iOS 14+, Android 9+, Chrome, Firefox, Safari).
- Touch and keyboard both first-class: Space/Enter fires, Escape pauses, keypad glyphs are focusable.
- Arkalon Voice and Web Audio polyphony degrade gracefully where unsupported.

---

## Disclaimer

Arkalon Daily is a skill-tracking game experience. Scores, streaks, and rankings are purely recreational and hold no monetary value. Challenges reset daily at 00:00 UTC; missed days cannot be replayed.

---

## Privacy

No emails, passwords, or PII are collected. Identity is an anonymous ecosystem UUID; sound and version preferences live only in your browser's localStorage. Server logs never store personally identifiable information.

---

## License

Copyright (c) 2026 Alex Degerman. All Rights Reserved.

Arkalon Daily and all associated source code, assets, systems, and files are proprietary. Unauthorized copying, modification, distribution, public hosting, sublicensing, or use of this software, in whole or in part, is strictly prohibited without prior written permission from the copyright holder.

---

*Part of the [Arkalon Network](https://network.rpsleague.fi)*