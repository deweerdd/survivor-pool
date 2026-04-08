# Backlog

Prioritized task queue. Any Claude session can pick the next unassigned item. Mark items `[x]` when done and note the date.

Tasks should be self-contained: include enough context that an agent can start without asking questions.

---

## Priority: High (before public launch)

- [x] **Finale episode mode** (2026-04-08) — The final episode of a season works differently: instead of picking who gets eliminated, users pick who they think will win. Admin flags an episode as `is_finale` (new boolean column on `episodes`). When `is_finale` is true: (1) allocation UI changes copy to explain "pick who you think will win," (2) users still distribute 20 points across contestants and can spread across multiple to play the odds, (3) scoring inverts — only points placed on the sole winner pay out; points on non-winners are simply ignored (no penalty). Needs: migration to add `is_finale` to episodes, admin UI toggle, allocation page UI changes (banner/messaging), scoring logic update in `get_pool_scores` RPC or `buildLeaderboard`.
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
