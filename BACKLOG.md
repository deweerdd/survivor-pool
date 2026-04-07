# Backlog

Prioritized task queue. Any Claude session can pick the next unassigned item. Mark items `[x]` when done and note the date.

Tasks should be self-contained: include enough context that an agent can start without asking questions.

---

## Priority: High (before public launch)

- [ ] **CSRF protection on server actions** — Verify Next.js built-in origin checking is active and not bypassed. All `lib/actions/*.ts` accept bare `FormData` from forms.
- [ ] **Rate limiting on invite code guessing** — `joinByInviteCodeAction` has no throttle. 6-char alphanumeric codes are brute-forceable without limits. Add rate limiting via middleware or DB-level counter.
- [ ] **Atomic allocation upsert** — `submitAllocation` does delete-then-insert without a transaction. If the insert fails mid-way, the user loses their allocation. Wrap in a Postgres function or Supabase RPC.
- [ ] **Input validation on admin forms** — `createSeason`, `createContestant`, `createEpisode` pass input straight to DB with no length/format validation. Add server-side checks before insert.
- [ ] **Cache or move middleware profile query** — Every protected route queries `profiles` for `is_admin` and `profile_complete`. No caching — latency/cost concern at scale, and a Supabase outage breaks all protected routes. Consider moving checks to layout level or caching via headers.

## Priority: Medium

- [ ] **Security headers (CSP, X-Frame-Options)** — No Content Security Policy or frame protection configured in `next.config.ts`. Add `headers()` config.
- [ ] **RLS integration tests** — Architecture relies on RLS for data isolation, but no tests confirm policies work as expected. Add tests that verify access as different user roles.
- [ ] **Admin audit logging** — Admin actions (activate season, record elimination, lock episode) have no audit trail. Log who did what and when — either a DB table or structured logging.

## Priority: Low

<!-- Add future work here -->
