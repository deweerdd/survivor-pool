# ADR 002: Scoring Logic Design

**Date**: 2024-03-01
**Status**: Accepted

## Context
Need to decide how and when scores are calculated.

## Decision
Calculate scores on-the-fly in the server component using pure functions in `lib/scoring.ts`, rather than storing computed scores in the database.

## Reasons
- **Simplicity**: No need to maintain a separate scores table or run background jobs.
- **Correctness**: Scores are always derived from the source of truth (picks + eliminations).
- **Testability**: Pure functions are easy to unit test without DB fixtures.
- **Data set is small**: A typical Survivor season has ~18 episodes × ~20 players × ~20 picks = ~7,200 rows. Fetching and computing this client-side is trivial.

## Trade-offs
- For very large pools (hundreds of players), we might want to cache scores. We can add this later without changing the API.
- No historical audit trail of computed scores, but picks are immutable after lock so recalculation is always correct.

## Rules encoded
- Players allocate up to 20 points per episode across any active survivors.
- Points are earned equal to the points placed on survivors eliminated that episode.
- Scores are hidden until `episodes.results_release_at` passes.
