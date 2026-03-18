# Survivor Pool — Architecture

## Stack

| Layer             | Technology                               |
| ----------------- | ---------------------------------------- |
| Framework         | Next.js 16 (App Router)                  |
| Database + Auth   | Supabase (Postgres + GoTrue)             |
| Styling           | Tailwind CSS v4                          |
| Server client     | `@supabase/ssr`                          |
| Scraping          | `cheerio` (server-side, admin-triggered) |
| Hosting (planned) | Vercel                                   |

---

## Supabase Schema

### `profiles`

Extends `auth.users`. Created automatically via trigger on user signup.

| Column         | Type          | Notes                      |
| -------------- | ------------- | -------------------------- |
| `id`           | `uuid` PK     | references `auth.users.id` |
| `email`        | `text`        |                            |
| `display_name` | `text`        |                            |
| `is_admin`     | `boolean`     | default `false`            |
| `created_at`   | `timestamptz` |                            |

### `seasons`

| Column       | Type          | Notes                            |
| ------------ | ------------- | -------------------------------- |
| `id`         | `serial` PK   |                                  |
| `name`       | `text`        | e.g. "Survivor 47"               |
| `wiki_url`   | `text`        | fandom wiki URL for scraping     |
| `is_active`  | `boolean`     | only one active season at a time |
| `created_at` | `timestamptz` |                                  |

### `contestants`

| Column       | Type                    | Notes             |
| ------------ | ----------------------- | ----------------- |
| `id`         | `serial` PK             |                   |
| `season_id`  | `int` FK → `seasons.id` |                   |
| `name`       | `text`                  |                   |
| `tribe`      | `text`                  | nullable          |
| `img_url`    | `text`                  | nullable          |
| `is_active`  | `boolean`               | still in the game |
| `created_at` | `timestamptz`           |                   |

### `episodes`

| Column           | Type                    | Notes                     |
| ---------------- | ----------------------- | ------------------------- |
| `id`             | `serial` PK             |                           |
| `season_id`      | `int` FK → `seasons.id` |                           |
| `episode_number` | `int`                   |                           |
| `title`          | `text`                  | nullable                  |
| `air_date`       | `date`                  | nullable                  |
| `is_locked`      | `boolean`               | true = allocations closed |
| `created_at`     | `timestamptz`           |                           |

### `eliminations`

| Column          | Type                        | Notes |
| --------------- | --------------------------- | ----- |
| `id`            | `serial` PK                 |       |
| `episode_id`    | `int` FK → `episodes.id`    |       |
| `contestant_id` | `int` FK → `contestants.id` |       |
| `created_at`    | `timestamptz`               |       |

### `pools`

| Column        | Type                      | Notes                                |
| ------------- | ------------------------- | ------------------------------------ |
| `id`          | `serial` PK               |                                      |
| `season_id`   | `int` FK → `seasons.id`   |                                      |
| `name`        | `text`                    |                                      |
| `is_public`   | `boolean`                 | true = global pool, no invite needed |
| `invite_code` | `text`                    | unique, nullable for public pools    |
| `created_by`  | `uuid` FK → `profiles.id` | nullable for system pools            |
| `created_at`  | `timestamptz`             |                                      |

### `pool_members`

| Column      | Type                      | Notes |
| ----------- | ------------------------- | ----- |
| `id`        | `serial` PK               |       |
| `pool_id`   | `int` FK → `pools.id`     |       |
| `user_id`   | `uuid` FK → `profiles.id` |       |
| `joined_at` | `timestamptz`             |       |
| UNIQUE      | `(pool_id, user_id)`      |       |

### `allocations`

Core game mechanic — player distributes 20 points per episode.

| Column          | Type                                            | Notes       |
| --------------- | ----------------------------------------------- | ----------- |
| `id`            | `serial` PK                                     |             |
| `pool_id`       | `int` FK → `pools.id`                           |             |
| `episode_id`    | `int` FK → `episodes.id`                        |             |
| `user_id`       | `uuid` FK → `profiles.id`                       |             |
| `contestant_id` | `int` FK → `contestants.id`                     |             |
| `points`        | `int`                                           | must be > 0 |
| `created_at`    | `timestamptz`                                   |             |
| UNIQUE          | `(pool_id, episode_id, user_id, contestant_id)` |             |
| CHECK           | `points > 0`                                    |             |

**Invariant:** For a given `(pool_id, episode_id, user_id)`, the sum of `points` across all rows must equal exactly 20. Enforced at the application layer (server action validates before insert).

---

## Scoring Logic

Scores are computed via a Postgres function called via RPC.

```sql
-- Returns leaderboard rows for a given pool
create or replace function get_pool_scores(p_pool_id int)
returns table(user_id uuid, display_name text, total_points bigint)
language sql stable as $$
  select
    a.user_id,
    pr.display_name,
    sum(a.points) as total_points
  from allocations a
  join eliminations e
    on e.episode_id = a.episode_id
   and e.contestant_id = a.contestant_id
  join profiles pr on pr.id = a.user_id
  where a.pool_id = p_pool_id
  group by a.user_id, pr.display_name
  order by total_points desc;
$$;
```

Called from a Server Component:

```ts
const { data } = await supabase.rpc("get_pool_scores", { p_pool_id: poolId });
```

---

## Admin Role

- `profiles.is_admin = true` grants access to `/admin/*` routes.
- Middleware checks `is_admin` and redirects non-admins away from `/admin`.
- Admin-only writes (creating seasons, recording eliminations) use the **service-role client** (`SUPABASE_SERVICE_ROLE_KEY`) which bypasses RLS.
- Service-role client is only instantiated in Server Actions / Route Handlers — never shipped to the browser.

```ts
// lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

---

## Scraper Design

- Target: Survivor fandom wiki (e.g. `https://survivor.fandom.com/wiki/Survivor_47`)
- Library: `cheerio` (server-side HTML parsing)
- Trigger: admin-only POST to `/api/admin/scrape`
- What it imports: contestant names, tribes, episode list, eliminations per episode
- Scrape is idempotent — upserts rows, does not duplicate

```
POST /api/admin/scrape
Body: { seasonId: number }
Auth: must be admin (checked server-side)
```

---

## Folder Structure

```
survivor-pool/
├── app/
│   ├── page.tsx                    # redirects → /dashboard
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx                # Google OAuth sign-in
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts            # OAuth callback handler
│   ├── api/
│   │   └── admin/
│   │       └── scrape/
│   │           └── route.ts        # POST scrape endpoint
│   ├── dashboard/
│   │   ├── page.tsx                # dashboard home
│   │   └── pools/
│   │       ├── page.tsx            # browse/join/create pools
│   │       └── [poolId]/
│   │           ├── page.tsx        # pool leaderboard
│   │           └── allocate/
│   │               └── page.tsx    # allocation form
│   └── admin/
│       ├── layout.tsx              # admin auth gate
│       ├── page.tsx                # admin home
│       ├── seasons/
│       │   ├── page.tsx            # manage seasons
│       │   └── ScrapeButton.tsx    # client component for scrape trigger
│       ├── contestants/
│       │   └── page.tsx            # manage contestants
│       └── episodes/
│           └── page.tsx            # manage episodes + eliminations
├── components/
│   └── AllocationForm.tsx          # client component (points allocation UI)
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # browser client
│   │   ├── server.ts               # server client (SSR)
│   │   ├── admin.ts                # service-role client (server only)
│   │   └── database.types.ts       # generated types (supabase gen types)
│   ├── pools.ts                    # pool + membership logic (TDD)
│   ├── leaderboard.ts              # leaderboard builder (TDD)
│   └── scraper.ts                  # wiki scraper (cheerio)
├── middleware.ts
├── architecture.md
├── features.md
└── CLAUDE.md
```

---

## Component Patterns

| Pattern                           | When to use                                            |
| --------------------------------- | ------------------------------------------------------ |
| Server Component (default)        | Data fetching, leaderboards, read-only pages           |
| Client Component (`'use client'`) | Forms, interactive UI, allocation input                |
| Server Action                     | Mutations (join pool, submit allocation, admin writes) |
| Route Handler                     | Scraper endpoint, webhook-style operations             |

**Rule:** never import service-role client or `SUPABASE_SERVICE_ROLE_KEY` in a Client Component or any file that could be bundled for the browser.

---

## Middleware

Current `middleware.ts` protects `/dashboard/*` and redirects `/login` if authenticated.

Extensions needed:

- Protect `/admin/*` — check `profiles.is_admin`, redirect to `/dashboard` if false
- Auto-join public pool on first dashboard visit

---

## Environment Variables

| Variable                        | Used in         | Notes                        |
| ------------------------------- | --------------- | ---------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | client + server | public                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | public                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | server only     | never expose                 |
| `NEXT_PUBLIC_SITE_URL`          | OAuth redirect  | e.g. `http://localhost:3000` |

---

## Key Invariants

1. Allocations are immutable once `episodes.is_locked = true`.
2. A player's allocations for an episode must sum to exactly 20 points.
3. Players can only allocate points to contestants with `is_active = true` at the time the episode opens.
4. Only one season can have `is_active = true` at a time.
5. A user can only appear once in a pool (`pool_members` unique constraint).
6. Eliminations are recorded by admin after an episode airs — this triggers scoring.
7. The service-role client is only ever instantiated in server-side code.
