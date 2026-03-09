# Survivor Pool — Claude Code Guide

## What this app does
A Survivor TV show office pool. Players get 20 points per week to allocate across any active survivors. Points earned = points placed on survivors who are eliminated that episode.

## Stack
- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui** (components in `components/ui/`)
- **Supabase** (Postgres database + Google OAuth)
- **Zod** (input validation)
- **TanStack Query** (client-side data fetching)

## Common Commands
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run type-check   # TypeScript check without building

# Supabase CLI (install separately: npm i -g supabase)
supabase db push                    # Push migrations to Supabase
supabase gen types typescript --project-id <id> --schema public > lib/types.ts
```

## Project Structure
```
app/
  (auth)/login/         # Sign-in page (Google OAuth)
  (app)/dashboard/      # User's pools overview
  (app)/pool/[id]/      # Pool view: leaderboard + episode list
  (app)/pool/[id]/picks/  # Weekly pick allocation UI
  (app)/pool/[id]/admin/  # Commissioner tools
  (app)/super-admin/    # Super admin: seasons, cast, eliminations
  api/auth/callback/    # Supabase OAuth callback handler
components/
  ui/                   # shadcn/ui primitives (never edit directly)
  picks/                # Point allocation UI components
  leaderboard/          # Leaderboard display components
lib/
  supabase/
    client.ts           # Browser Supabase client
    server.ts           # Server-side Supabase client (uses cookies)
  db/
    pools.ts            # All pool-related DB queries
    picks.ts            # All picks-related DB queries
    episodes.ts         # Episode/season DB queries
    profiles.ts         # User profile DB queries
  scoring.ts            # Score calculation logic (unit tested)
  types.ts              # Shared TypeScript types (generated from Supabase)
  validations.ts        # Zod schemas for all user input
supabase/
  migrations/           # SQL migrations (numbered, never hand-edit DB)
middleware.ts           # Protects (app) routes, redirects to login
docs/decisions/         # Architecture Decision Records (ADRs)
```

## Roles
- **Super Admin** (`profiles.is_super_admin = true`): Manages global season data — cast, episodes, eliminations. Set manually in DB.
- **Commissioner**: Creates and runs a specific pool. `pools.commissioner_id = user.id`
- **Player**: Member of one or more pools. Submits weekly picks.

## Key Business Rules
- Points per user per episode must sum to ≤ 20
- Picks lock at `episodes.picks_lock_at` (set by Super Admin)
- Scores/leaderboard hidden until `episodes.results_release_at` (per pool? currently global via episode)
- Survivors marked `is_active = false` when eliminated (set `eliminated_episode_id`)

## Database
All schema changes go through `supabase/migrations/`. Never hand-edit the DB.
Migration files: `YYYYMMDD_description.sql`

Tables: `seasons`, `survivors`, `pools`, `pool_members`, `episodes`, `picks`, `profiles`

## Coding Conventions
- **Server components** fetch data; add `// Server component` comment at top
- **Client components** handle interaction; add `"use client" // reason` at top
- All DB queries live in `lib/db/` — never scattered in components
- Zod schemas in `lib/validations.ts` for all user input
- One concern per file; colocate component logic near usage

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (client-safe)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (client-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only, never expose)

## Known Gotchas
- Supabase SSR: always use `@supabase/ssr` helpers, not the browser client, in Server Components and middleware
- `middleware.ts` must refresh the session on every request to keep auth working
- shadcn/ui components are in `components/ui/` and should not be edited — create wrappers instead
- The `profiles` table mirrors `auth.users` — created automatically via DB trigger on signup
