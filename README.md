# Arkalon Daily

A browser-based daily puzzle platform offering five optional daily challenges across five distinct cognitive categories. One attempt per category per day. Come back tomorrow.

---

## The Five Categories

| Category | Core Skill | Family |
|---|---|---|
| **Recall** | Working memory, sequence retention | Arkalon Vision |
| **Surge** | Rapid reaction to changing stimuli | Surge Frenzy |
| **Cipher** | Pattern reasoning and rule discovery | Wild Prediction |
| **Strike** | Controlled timing accuracy | Sniper Challenge |
| **Depths** | Spatial deduction and grid logic | Crystal Mine |

---

## Architecture

### Deterministic Puzzle Engine

The core engineering challenge: every player who opens a category on the same day plays the **identical challenge**, fairly, without any server-side game tick.

Daily seeds are derived with `HMAC-SHA256(secret, "YYYY-MM-DD:category")`. The seed is consumed server-side by `mulberry32`, a seeded PRNG that produces the full challenge deterministically from a compact authored spec. The seed never reaches the client.

Each category has 15 hand-crafted base configurations - curated axis combinations covering the space of interesting challenges for that skill type. The generator applies continuous-parameter variation (timing, window size, speed) to each base, producing 200+ meaningfully distinct daily challenge instances per category.

Every generated challenge passes a validation pass before acceptance. Invalid or monotone combinations are rejected; the generator re-seeds with a deterministic counter suffix and retries, so the accepted instance is identical for every player.

For more detail: [Puzzle Engine](docs/puzzle-engine.md)

---

### Scoring

All scoring is server-authoritative. The client submits raw performance metrics (`family_specific_metrics`); the server recomputes `normalized_score` from scratch. No client-submitted score is trusted.

Each category uses a scoring model suited to its skill type:

- **Recall** - Continuous: accuracy weighted by round difficulty, modified by completion speed
- **Surge** - Speed-first: reaction grade per node, combo multiplier, decoy penalty
- **Strike** - Speed-first: deviation from target centre maps to grade per shot
- **Cipher** - Logic-first: accuracy base + efficiency bonus for low error count
- **Depths** - Logic-first: discovery base + efficiency bonus for low wasted charges

Scores are 0-100 integers. The single continuous curve means every player's score is directly comparable on the same leaderboard.

For more detail: [Scoring Models](docs/scoring.md)

---

### Identity and Recovery

No accounts, no email, no OAuth. Identity is an automatic anonymous UUID stored in `localStorage`. A human-readable recovery code (`WORD-WORD-NNNN`) is the only mechanism for restoring a profile on a new device.

The recovery code is stored as plaintext - it is a low-entropy convenience credential, not a password protecting sensitive data, and must be re-displayable at any time from the profile page.

---

### Share Cards

Result cards are generated entirely client-side. `html2canvas` renders an offscreen `ShareResultCard` component to a PNG Blob, which is handed to the Web Share API with file attachment support. Each category has a unique visual performance strip that tells the story of the attempt without spoiling the challenge content.

For more detail: [Share System](docs/share-cards.md)

---

### Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| Styling | Tailwind CSS v4 (CSS-first, no config file) |
| State | Zustand 5 (`puzzleStore`, `uiStore`, `musicStore`) |
| Database | PostgreSQL 17 via `pg.Pool` in Server Actions |
| Seed generation | HMAC-SHA256 + mulberry32 PRNG |
| Share cards | html2canvas + Web Share API |
| Deployment | Docker on Hetzner VPS, Caddy reverse proxy |

---

### Infrastructure

Single Docker container behind a shared Caddy reverse proxy. PostgreSQL runs in a shared container on the same VPS via a private `db-net` Docker network - no public database port. Daily puzzle generation runs via a VPS crontab at 00:00 UTC hitting a secret-protected API route.

The application is one of several in the Arkalon Network, sharing VPS infrastructure but owning its own database (`daily_db`) with no cross-app data access.

---

## Deployment Notes

Environment variables are documented in the implementation architecture. Production secrets live only in the VPS `.env` file. No credentials are committed to this repository or exposed in CI.

---

*Part of the [Arkalon Network](https://network.rpsleague.fi)*