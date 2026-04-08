# Backlog

Prioritized task queue. Any Claude session can pick the next unassigned item. Mark items `[x]` when done and note the date.

Tasks should be self-contained: include enough context that an agent can start without asking questions.

---

## Priority: High (before public launch)

- [x] **Finale episode mode** (2026-04-08) — The final episode of a season works differently: instead of picking who gets eliminated, users pick who they think will win. Admin flags an episode as `is_finale` (new boolean column on `episodes`). When `is_finale` is true: (1) allocation UI changes copy to explain "pick who you think will win," (2) users still distribute 20 points across contestants and can spread across multiple to play the odds, (3) scoring inverts — only points placed on the sole winner pay out; points on non-winners are simply ignored (no penalty). Needs: migration to add `is_finale` to episodes, admin UI toggle, allocation page UI changes (banner/messaging), scoring logic update in `get_pool_scores` RPC or `buildLeaderboard`.
- [x] **Sole Survivor pick** (2026-04-08) — Each user can make a separate "Sole Survivor" pick per pool, betting on who will win the season. Worth 2 pts per episode remaining (inclusive of the episode the pick was made on). Picking earlier = more points. Users can change anytime but forfeit earlier-episode value. If their pick is eliminated, they get a nudge to pick a new one. Points only count after the finale once the winner is confirmed by admin.
  - **Data model:** New `sole_survivor_picks` table: `id`, `pool_id` (FK), `user_id` (FK), `contestant_id` (FK), `picked_at_episode` (int — episode number of the next unlocked episode when pick was made), `created_at`, `updated_at`. Unique on `(pool_id, user_id)` — one active pick per user per pool. Upsert on change.
  - **Scoring:** If picked contestant wins the finale: `2 × (total_episodes − picked_at_episode + 1)`. If picked contestant did not win (or no pick made): 0. Added to leaderboard total only after finale results are recorded.
  - **UI:** Pick interface accessible from pool page. Shows active contestants, current pick (if any), and projected points. After elimination of their pick, show a banner/nudge prompting a new pick.
  - **Sub-tasks:**
    - [x] Migration: create `sole_survivor_picks` table + RLS policies
    - [x] Business logic in `lib/sole-survivor.ts` (TDD): `calculateSoleSurvivorPoints`, `isPickEliminated`
    - [x] Server actions in `lib/actions/sole-survivor.ts`: `makeSoleSurvivorPickAction`
    - [x] UI: Sole Survivor pick section on pool detail page (`app/dashboard/pools/[poolId]/page.tsx`)
    - [x] Leaderboard integration: add sole survivor bonus to `buildLeaderboard` after finale
    - [x] Elimination nudge: detect when user's pick is eliminated and show prompt
- [ ] **CSRF protection on server actions** — Verify Next.js built-in origin checking is active and not bypassed. All `lib/actions/*.ts` accept bare `FormData` from forms.
- [ ] **Rate limiting on invite code guessing** — `joinByInviteCodeAction` has no throttle. 6-char alphanumeric codes are brute-forceable without limits. Add rate limiting via middleware or DB-level counter.
- [ ] **Atomic allocation upsert** — `submitAllocation` does delete-then-insert without a transaction. If the insert fails mid-way, the user loses their allocation. Wrap in a Postgres function or Supabase RPC.
- [ ] **Input validation on admin forms** — `createSeason`, `createContestant`, `createEpisode` pass input straight to DB with no length/format validation. Add server-side checks before insert.
- [ ] **Cache or move middleware profile query** — Every protected route queries `profiles` for `is_admin` and `profile_complete`. No caching — latency/cost concern at scale, and a Supabase outage breaks all protected routes. Consider moving checks to layout level or caching via headers.

## Priority: Medium

- [x] **Auto-lock episodes before air time** (2026-04-07) — Episodes should auto-lock 1 hour before airing (Wednesdays 8pm ET → lock at 7pm ET). Implement request-time auto-locking: `autoLockEpisodes()` runs on allocate page load, allocation submission, and admin episodes page. Uses `air_date` from the episodes table + ET timezone math to determine lock time. Flips `is_locked = true` via admin client. No cron needed — idempotent, runs server-side on every relevant page load. New files: `lib/lock-utils.ts`, `lib/actions/auto-lock.ts`. Modified: `lib/episode-utils.ts`, `lib/actions/allocations.ts`, `app/admin/episodes/page.tsx`. Plan: `.claude/plans/partitioned-inventing-penguin.md`.
- [ ] **Security headers (CSP, X-Frame-Options)** — No Content Security Policy or frame protection configured in `next.config.ts`. Add `headers()` config.
- [ ] **RLS integration tests** — Architecture relies on RLS for data isolation, but no tests confirm policies work as expected. Add tests that verify access as different user roles.
- [ ] **Admin audit logging** — Admin actions (activate season, record elimination, lock episode) have no audit trail. Log who did what and when — either a DB table or structured logging.

## Priority: Low

<!-- Add future work here -->
