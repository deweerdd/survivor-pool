# Survivor Pool — TODO

Items to address before or after launch. Checked items are done.

---

## Security — Must Fix (before public launch)

- [ ] **CSRF protection on server actions** — Verify Next.js built-in origin checking is active and not bypassed. All `lib/actions/*.ts` accept bare `FormData` from forms.
- [ ] **Rate limiting on invite code guessing** — `joinByInviteCodeAction` has no throttle. 6-char alphanumeric codes are brute-forceable without limits. Add rate limiting via middleware or DB-level counter.
- [ ] **Atomic allocation upsert** — `submitAllocation` does delete-then-insert without a transaction. If the insert fails mid-way, the user loses their allocation. Wrap in a Postgres function or Supabase RPC.
- [ ] **Input validation on admin forms** — `createSeason`, `createContestant`, `createEpisode` pass input straight to DB with no length/format validation. Add server-side checks before insert.
- [ ] **Cache or move middleware profile query** — Every protected route queries `profiles` for `is_admin` and `profile_complete`. No caching — latency/cost concern at scale, and a Supabase outage breaks all protected routes. Consider moving checks to layout level or caching via headers.

## Security — Should Fix

- [ ] **Security headers (CSP, X-Frame-Options)** — No Content Security Policy or frame protection configured in `next.config.ts`. Add `headers()` config.
- [ ] **RLS integration tests** — Architecture relies on RLS for data isolation, but no tests confirm policies work as expected. A misconfigured policy could expose cross-user data. Add tests that verify access as different user roles.
- [ ] **Admin audit logging** — Admin actions (activate season, record elimination, lock episode) have no audit trail. For a game with stakes, log who did what and when — either a DB table or structured logging.
