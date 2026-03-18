# Security & DevOps Review — Survivor Pool

**Date:** 2026-03-13
**Scope:** Phase 1–2 (DB schema, migrations, Supabase clients, auth flow, middleware)
**Status:** Pre-feature (no admin panel, no allocation form, no API routes yet)

---

## Summary

Overall the foundation is solid. Auth plumbing is correct (`getUser()` everywhere, `server-only` on the admin client, RLS on every table). However there is **one critical privilege escalation vulnerability** that must be fixed before any admin features are shipped, plus a few medium-level issues worth addressing soon.

---

## Findings

### CRITICAL

#### C1 — `is_admin` Self-Escalation via Profiles RLS ✅ RESOLVED (migration 20260313120000)

**File:** `supabase/migrations/20260311175951_create_profiles_table.sql`

The profiles update policy is:

```sql
create policy "users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

This permits any authenticated user to run:

```sql
UPDATE profiles SET is_admin = true WHERE id = auth.uid();
```

Both `using` and `with check` pass because `auth.uid() = id` is satisfied. There is no column-level restriction. Once `is_admin = true`, that user passes every admin RLS policy on seasons, contestants, episodes, and eliminations — and once the admin UI is built (Phase 3), they'd have full admin access.

**Fix options (pick one):**

1. Revoke `UPDATE` on the `is_admin` column from the `authenticated` role:
   ```sql
   REVOKE UPDATE (is_admin) ON public.profiles FROM authenticated;
   ```
2. Add a `BEFORE UPDATE` trigger that raises an exception if a non-admin attempts to flip `is_admin`.
3. Move `is_admin` to a separate table (`admin_users`) that has no user-writable insert/update policy, only service-role writes.

**Option 1 (column-level revoke) is the simplest and most idiomatic Postgres solution.**

---

### HIGH

#### H1 — Public Pool Read Exposes Private Pool Invite Codes to Unauthenticated Users ✅ RESOLVED (migration 20260313120000)

**File:** `supabase/migrations/20260311180200_create_pools_and_pool_members.sql`

```sql
create policy "pools_public_read"
  on public.pools for select
  using (true);
```

`using (true)` means anyone — including unauthenticated requests via the anon key — can `SELECT * FROM pools` and enumerate all pools including their `invite_code` values. The invite code is meant to be a semi-secret token for joining private pools. If all codes are publicly readable, they're not actually secret.

**Fix:** At minimum, require authentication to read pools:

```sql
using (auth.uid() IS NOT NULL)
```

A stricter version would only show public pools or pools the user is a member of, but that requires a join and is more complex. The minimum viable fix is requiring authentication.

---

### MEDIUM

#### M1 — `get_pool_scores` Has No Pool Membership Check

**File:** `supabase/migrations/20260311180400_create_get_pool_scores_function.sql`

The RPC function is granted `execute` to `authenticated`. Any authenticated user can call `get_pool_scores(p_pool_id)` with any pool ID and receive the leaderboard including all members' `display_name` and total points. For private pools, this leaks membership and score data to non-members.

**Note:** `display_name` is low-sensitivity data, but it's still unintended access to private pool data.

**Fix:** Add a membership guard inside the function or create a separate policy. The simplest approach is to add a `WHERE EXISTS (SELECT 1 FROM pool_members WHERE pool_id = p_pool_id AND user_id = auth.uid())` check, or handle access control in the Server Component before calling the RPC.

---

#### M2 — Any Authenticated User Can Create a Pool (Including Public Ones) ✅ RESOLVED (migration 20260313120000)

**File:** `supabase/migrations/20260311180200_create_pools_and_pool_members.sql`

There are two overlapping INSERT policies on `pools`:

```sql
create policy "pools_admin_insert"
  on public.pools for insert to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "pools_owner_insert"
  on public.pools for insert to authenticated
  with check (created_by = auth.uid());
```

`pools_owner_insert` allows any authenticated user to insert a row as long as `created_by = auth.uid()`. There is no restriction preventing a user from setting `is_public = true` or choosing any `season_id`. This means any user can create an arbitrary number of pools, attach them to any season, and mark them as public — which would make them appear in the public pool list.

**Context:** Phase 4.4 does intend for users to create private pools, so this may be partially intentional. But the ability to set `is_public = true` and to insert pools for any season should be restricted to admins.

**Fix:** Add a `WITH CHECK` clause to `pools_owner_insert` that enforces `is_public = false` and possibly restricts to the active season.

---

#### M3 — No Security Headers in `next.config.ts`

**File:** `next.config.ts`

The config is empty. Next.js does not add security headers by default. Before deploying to Vercel, add at minimum:

- `Content-Security-Policy` — restricts script/style sources
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

These can be added as `headers()` in `next.config.ts`.

---

### LOW

#### L1 — `NEXT_PUBLIC_SITE_URL` Missing from `.env.example`

**File:** `.env.example`

`app/login/page.tsx` uses `process.env.NEXT_PUBLIC_SITE_URL` for the OAuth `redirectTo`. The variable is not in `.env.example`. If someone sets up the project from the example file, OAuth will silently use `undefined/auth/callback` as the redirect URL and auth will break entirely.

**Fix:** Add `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.example`.

---

#### L2 — Auth Callback Doesn't Handle Missing `code` Gracefully

**File:** `app/auth/callback/route.ts`

If the `code` param is absent (e.g., user navigates to `/auth/callback` directly), the function falls through and redirects to `/login?error=auth_failed`. This is fine functionally, but the error message is not surfaced anywhere in the login page UI — it's silently ignored. Not a security issue but a UX gap that will confuse users.

---

#### L3 — Admin RLS Policies Use Row-Level Subquery (Performance Note)

**Files:** Multiple migration files

Every admin write policy does:

```sql
EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
```

This is correct and safe, but it fires a subquery on every write. Once the admin panel is built and doing batch upserts (e.g., scraping 20 contestants at once), this will query `profiles` once per row. This is fine for now but worth noting — the service-role client (which bypasses RLS entirely) is the right tool for batch admin writes, which is already the architecture's intention.

---

#### L4 — `allocations` Missing `UPDATE` Policy

**File:** `supabase/migrations/20260311180300_create_allocations.sql`

There is no `UPDATE` policy on `allocations`. This is intentional since the app design is delete-then-reinsert. However it means if a client ever attempts `UPDATE allocations SET ...`, it will fail silently via RLS (returning 0 rows affected, not an error). This could be confusing to debug. The absence of an update path is a valid security choice — just make sure it stays consistent in the application layer.

---

## What's Good

| Area                                                                 | Status                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `getUser()` used instead of `getSession()` everywhere                | ✅ Correct — `getSession()` trusts unvalidated JWT claims                        |
| `server-only` on admin client                                        | ✅ Prevents service-role key from leaking to browser bundle                      |
| RLS enabled on all 7 tables                                          | ✅ No table left unprotected                                                     |
| `.env.local` in `.gitignore`                                         | ✅ Credentials not committed                                                     |
| `SUPABASE_SERVICE_ROLE_KEY` not prefixed `NEXT_PUBLIC_`              | ✅ Will not be embedded in client bundle                                         |
| `is_locked` check in allocations INSERT policy enforced at DB level  | ✅ Server action validation alone isn't sufficient — good to have this in DB too |
| `on delete cascade` on FK relationships                              | ✅ No orphaned rows possible                                                     |
| Trigger uses `security definer` with explicit `search_path = public` | ✅ Prevents search path injection in trigger                                     |
| `check (points > 0)` constraint on allocations                       | ✅ Business rule enforced at DB level                                            |
| Migration files use full 14-digit timestamps                         | ✅ No version collision risk                                                     |

---

## Priority Order for Fixes

1. **C1** — Fix `is_admin` escalation **before building any admin UI** (Phase 3)
2. **H1** — Fix `pools` public read policy **before Phase 4** (pool creation/joining)
3. **M2** — Restrict `pools_owner_insert` before Phase 4
4. **L1** — Fix `.env.example` now (5-minute fix, prevents future setup confusion)
5. **M1** — Fix `get_pool_scores` access before Phase 5 (leaderboard)
6. **M3** — Add security headers before any public deployment
