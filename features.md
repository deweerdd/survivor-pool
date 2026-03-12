# Survivor Pool — Feature Roadmap

Work through these one at a time. Each feature is scoped for a single session.

---

## Phase 1: Database Foundation

- [x] **1.1 — Create `profiles` table + auto-create trigger**
  SQL migration: `profiles` table with `id`, `email`, `display_name`, `is_admin`, `created_at`. Add `handle_new_user` trigger on `auth.users` insert. Enable RLS: users can read/update own row only.
  **Done when:** new Google login auto-creates a profile row.

- [x] **1.2 — Create `seasons` and `contestants` tables**
  SQL migration for both tables with all columns from architecture. RLS: public read, admin write only.
  **Done when:** tables exist with correct columns and RLS policies.

- [x] **1.3 — Create `episodes` and `eliminations` tables**
  SQL migration. RLS: public read, admin write only.
  **Done when:** tables exist with correct columns and RLS policies.

- [ ] **1.4 — Create `pools` and `pool_members` tables**
  SQL migration. RLS: public read for pools; pool_members readable by member, insertable by authenticated user.
  **Done when:** tables exist with RLS allowing users to join pools.

- [ ] **1.5 — Create `allocations` table**
  SQL migration with unique constraint and check constraint. RLS: user can read/write own allocations; read blocked after episode locks.
  **Done when:** table exists with constraints and RLS.

- [ ] **1.6 — Create `get_pool_scores` Postgres function**
  SQL: scoring RPC as defined in architecture. Grant execute to `authenticated` role.
  **Done when:** `supabase.rpc('get_pool_scores', { p_pool_id: 1 })` returns expected shape.

---

## Phase 2: Service Client + DB Helpers

- [ ] **2.1 — Add service-role client (`lib/supabase/admin.ts`)**
  Create the admin client file. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.example`. Document server-only restriction in the file.
  **Done when:** file exists and is importable in server-only code.

- [ ] **2.2 — Add DB helper modules**
  Create `lib/db/` with `seasons.ts`, `contestants.ts`, `episodes.ts`, `pools.ts`, `allocations.ts`. Each exports typed query functions used by Server Components and Server Actions.
  **Done when:** helpers are importable with correct return types.

- [ ] **2.3 — Type generation from Supabase**
  Run `supabase gen types typescript` and save output to `lib/supabase/database.types.ts`. Wire into client and server clients.
  **Done when:** `Database` type is available project-wide and `supabase.from('profiles')` is typed.

---

## Phase 3: Admin Panel

- [ ] **3.1 — Admin layout + auth gate (`app/admin/layout.tsx`)**
  Server Component: fetch profile, check `is_admin`, redirect to `/dashboard` if false. Render admin nav.
  **Done when:** non-admin users are redirected; admin users see admin nav.

- [ ] **3.2 — Admin: create/list seasons (`app/admin/seasons/page.tsx`)**
  Server Component shows season list. Server Action: create season (name, wiki_url). Only one active season at a time (deactivate others on activate).
  **Done when:** admin can create a season and mark it active.

- [ ] **3.3 — Admin: create/list contestants (`app/admin/contestants/page.tsx`)**
  Server Component shows contestants for active season. Server Action: create contestant manually.
  **Done when:** admin can add a contestant to a season.

- [ ] **3.4 — Admin: create/list episodes (`app/admin/episodes/page.tsx`)**
  Server Component shows episode list. Server Action: create episode with number and air date.
  **Done when:** admin can add episodes to a season.

- [ ] **3.5 — Admin: lock episode**
  Server Action: set `episodes.is_locked = true`. Button on episode list row.
  **Done when:** admin can lock an episode; locked episodes block further allocations.

- [ ] **3.6 — Admin: record elimination**
  Server Action: insert into `eliminations`, set `contestants.is_active = false`. UI: episode row expands to show contestant picker.
  **Done when:** admin can record which contestant was eliminated per episode.

- [ ] **3.7 — Scraper: install cheerio + write scrape logic (`lib/scraper.ts`)**
  `npm install cheerio`. Write function that fetches wiki URL and parses contestant names, tribes, episode list.
  **Done when:** scraper returns structured data from a real wiki URL.

- [ ] **3.8 — Scraper: Route Handler (`app/api/admin/scrape/route.ts`)**
  POST handler: verify admin, call scraper, upsert contestants + episodes into DB.
  **Done when:** POST to `/api/admin/scrape` populates DB from wiki.

- [ ] **3.9 — Admin: scrape button on season page**
  Button on season detail that POSTs to `/api/admin/scrape`. Shows loading + result toast.
  **Done when:** clicking scrape populates contestants and episodes for that season.

---

## Phase 4: Pool Management

- [ ] **4.1 — Create public pool on season activation**
  When admin activates a season (3.2), also insert one public pool for that season (`is_public = true`, no invite code).
  **Done when:** activating a season auto-creates a public pool.

- [ ] **4.2 — Browse pools page (`app/dashboard/pools/page.tsx`)**
  Server Component: list pools for active season. Show public pool + user's private pools. Join button.
  **Done when:** user can see available pools.

- [ ] **4.3 — Join pool (Server Action)**
  Insert into `pool_members`. Handle already-joined gracefully. Auto-join public pool on first dashboard visit.
  **Done when:** user can join a pool and is not double-added.

- [ ] **4.4 — Create private pool (Server Action + form)**
  Server Action: insert pool with `is_public = false` + random invite code. Form on pools page.
  **Done when:** user can create a private pool and receives an invite code.

- [ ] **4.5 — Join private pool by invite code**
  Form: enter invite code → look up pool → join. Show error if code not found.
  **Done when:** user can join a private pool via invite code.

---

## Phase 5: Allocation Flow

- [ ] **5.1 — Pool leaderboard page (`app/dashboard/pools/[poolId]/page.tsx`)**
  Server Component: call `get_pool_scores` RPC, render ranked list with scores. Show current episode info.
  **Done when:** leaderboard renders with correct scores after an elimination is recorded.

- [ ] **5.2 — Allocation form component (`components/AllocationForm.tsx`)**
  Client Component: shows active contestants with point inputs. Running total shows points remaining out of 20. Blocks submit if total ≠ 20.
  **Done when:** form correctly tracks allocation totals client-side.

- [ ] **5.3 — Allocation page (`app/dashboard/pools/[poolId]/allocate/page.tsx`)**
  Server Component: fetch active episode, fetch active contestants, check if episode is locked, fetch existing allocations. Render `AllocationForm` with pre-filled data.
  **Done when:** page loads correctly for open and locked episodes.

- [ ] **5.4 — Submit allocation (Server Action)**
  Validate: episode not locked, user in pool, sum = 20, only active contestants. Delete existing allocations for this (pool, episode, user), insert new rows atomically.
  **Done when:** allocation submits and is reflected in leaderboard after elimination.

- [ ] **5.5 — Allocation deadline UX**
  Show countdown or "locked" banner when episode `is_locked = true`. Disable form submit. Show user's last allocation if locked.
  **Done when:** locked episodes show read-only view of user's allocation.

---

## Phase 6: Dashboard + Navigation

- [ ] **6.1 — Dashboard home (`app/dashboard/page.tsx`)**
  Show active season name, link to pools, user's pool membership summary, quick link to allocate for current episode.
  **Done when:** dashboard gives a clear overview of the user's current game state.

- [ ] **6.2 — Nav bar (`components/NavBar.tsx`)**
  Client Component: logo, links to Dashboard / My Pools, admin link if `is_admin`, sign out button.
  **Done when:** nav bar appears on all dashboard pages with correct admin visibility.

- [ ] **6.3 — Middleware: protect `/admin` routes**
  Extend `middleware.ts` to check `is_admin` for `/admin/*` paths. Redirect to `/dashboard` if not admin.
  **Done when:** direct navigation to `/admin` by non-admin redirects correctly.

---

## Phase 7: Polish + Edge Cases

- [ ] **7.1 — Handle no active season**
  All pages that depend on active season show a friendly "No active season" message instead of crashing.
  **Done when:** app handles missing active season gracefully everywhere.

- [ ] **7.2 — Handle episode with no allocations yet**
  Leaderboard shows all pool members with 0 points when no allocations exist. Prompt to allocate.
  **Done when:** new pool with no allocations renders correctly.

- [ ] **7.3 — Contestant image display**
  Show `img_url` thumbnails on allocation form and leaderboard where populated. Fall back to initials avatar.
  **Done when:** contestant images display where available.

- [ ] **7.4 — Mobile layout pass**
  Audit allocation form and leaderboard for small screens. Fix any overflow or usability issues.
  **Done when:** core flows work on a 375px wide screen.

- [ ] **7.5 — Error boundary + loading states**
  Add `loading.tsx` and `error.tsx` for dashboard routes. Show skeleton or spinner during data fetches.
  **Done when:** navigation shows loading state; unexpected errors show recovery UI.

---

## Progress

**Current:** Phase 1 in progress.
**Next task:** 1.4 — Create `pools` and `pool_members` tables.
