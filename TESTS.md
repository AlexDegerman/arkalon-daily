# 🧪 Test Suite
Unit and integration tests covering Arkalon Daily's deterministic puzzle engine, server-authoritative scoring and enforcement, leaderboard math, and client session flow.

## 🎲 Deterministic Puzzle Engine Test Coverage
- **Scoring Engine**: Validates all five server-side scoring formulas (`scoreRecall`, `scoreSurge`, `scoreStrike`, `scoreCipher`, `scoreDepths`) including round weights, speed multipliers, combo caps, decoy penalties, grade thresholds, 0–100 clamping, and the `isSolved` threshold at 15.
- **Seeded PRNG**: Verifies mulberry32 determinism, `hexToSeed` parsing, bounded `nextInt`/`nextFloat`, `pickOne`, and non-mutating, reproducible `shuffle` behavior.
- **Challenge Validation**: Tests `validateDepthsSolvability` (charge-vs-deposit limits and clue-elimination proofs), the validator registry, and `generateWithValidation` deterministic retry with derived seeds.
- **Composition System**: Covers `calcChargeLimit` clue-type penalties, `calcClueTileCount`, all eight `calcSpawnInterval` timing profiles, `getSessionDurationMs` overrides, and the four `calcReticleX` motion functions with boundary clamping.
- **Family Determinism**: Loops every family across N seeds asserting `generate(seed)` is pure — same seed yields deep-equal output, different seeds diverge, and output shapes are valid.
- **Family Generators**: Per-family tests for ArkalonVision, SurgeFrenzy, SniperChallenge, WildPrediction, and CrystalMine covering base-config selection, continuous-variation clamps, and registered validator behavior.
- **Pattern Generators**: Ensures every cipher generator includes `correctAnswer` within `choices`, respects `choiceCount`, and produces valid elements for rule-discovery and constrained-choice rounds.
- **Streak Engine**: Tests `recomputeStreak` walking consecutive UTC dates backward, streak breaks on scores below 15 or date gaps, empty histories, and longest-streak preservation against a mock `PoolClient`.
- **Family Registry**: Validates the one-family-per-category mapping and unknown-family error paths.

## 🛡️ Server Actions & API Test Coverage
- **submitResult**: The highest-risk action — rate limiting (5/min), payload schema rejection, puzzle-date enforcement, unique-constraint (23505) duplicate blocking, server-side score recompute (never trusting the client), status derivation, streak upsert, and celebrate-once milestones at 7/30/100/365.
- **getDailyChallenge**: Tests already-played replay with regenerated seed data, missing-puzzle errors, trial gating, and that the seed is never exposed to clients.
- **getOrCreateDailyPlayer**: Covers cookie bootstrap via the Network Hub, dev-mode mock player, new-player insert with five category streaks, and existing-player display name return.
- **getCategoryStatuses**: Validates solved/failed/trial/available status mapping, streak joins, and yesterday-score surfacing.
- **getLeaderboard**: Tests daily top-50 ordering (score desc, elapsed asc), exact rank computation beyond the top 50, aggregate thresholds, `HAVING` qualification, and the 45-second board cache.
- **getYesterdayReview**: Covers score-bucket percentages, rank/percentile math, family-index lookup, and empty-day error paths.
- **completeTrial / getTrialChallenge**: Tests idempotent trial completion and per-category trial constraints (no deceptive motion, numeric clues only, guaranteed decoys) with derived-variant retries.
- **generateDailySeeds**: Tests skip-if-exists, `ON CONFLICT DO NOTHING` upsert, and per-category error isolation.
- **getPlayerProfile / rerollPlayerName / markRecoveryTutorialShown**: Tests auto-provisioning, percentile suppression below 25 players, Network reroll sync, and tutorial flag persistence.
- **Cron Route**: Enforces `Bearer CRON_SECRET` auth — 401 on missing or wrong header, 200 with `generateDailySeeds` called on success.
- **Health Route**: Tests the DB connectivity probe returning 200 on success and 503 on failure.

## 📚 Utility Library Test Coverage
- **format**: Validates `getScoreTierClass` threshold mapping, `getScoreTierSolidColor`, `getScoreRarity`, `formatDateTime`, and `formatElapsedMs` sub-second and minute formatting.
- **leaderboardPeriods**: Tests `getIsoWeekStartUtc` Monday computation across month and year boundaries, `addDaysUtc`, and the threshold tables.
- **displayMetrics**: Covers `buildDisplayMetrics` for all five categories including division-by-zero guards and Depths efficiency/waste calculation.
- **hmac**: Tests `deriveDailySeed` determinism, missing-secret throw, and `getUtcDateString` formatting.
- **updates / ttsLines / networkRecommendations**: Tests `LATEST_UPDATE` ordering, result TTS tier boundaries, milestone line lookup, and recommendation picker null and single-entry behavior.

## 🖥️ Frontend Test Coverage
- **Stores**: `uiStore` setters and modal toggles, `puzzleStore` `pauseSignal` increment, and `musicStore` context switching with no-repeat track advancement.
- **Hooks**: `useActiveView` path-to-view mapping and `useTabGuard` BroadcastChannel duplicate detection with a mocked channel.
- **CategorySurface**: The central state machine across loading → trial-explainer → playing → submitting → result → error phases, trial gating, per-category completion handlers, and milestone overlay triggering.

## 📊 Coverage Summary
- **Deterministic Puzzle Engine**: 13 test files covering scoring, PRNG, validation, composition, five families, determinism, pattern generators, streaks, and registry
- **Server Actions & API**: 14 test files covering 12 server actions and 2 API routes
- **Utility Libraries**: 7 test files covering formatting, periods, metrics, HMAC, updates, TTS, and recommendations
- **Frontend**: 6 test files covering 3 stores, 2 hooks, and the CategorySurface state machine