# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run type-check   # TypeScript check (tsc --noEmit)
npm run lint         # ESLint (next/core-web-vitals)
```

No test runner is configured yet.

## Definition of Done

Before marking any feature or phase as complete, both must pass with zero errors:

```bash
npm run type-check
npx eslint app lib --ext .ts,.tsx
```

Do not mark a task done if either command reports errors.

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — from supabase.com project API settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from supabase.com project API settings
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never expose to client
- `NEXT_PUBLIC_SITE_URL` — e.g. `http://localhost:3000`

Also add `http://localhost:3000/auth/callback` as an allowed redirect URL in Supabase and enable Google OAuth provider.

## Migrations

Migration files live in `supabase/migrations/`. Always name them with a **full 14-digit timestamp** (`YYYYMMDDHHmmss`) followed by a descriptive slug:

```
20260311175951_create_profiles_table.sql
20260311180000_create_seasons_and_contestants.sql
```

Never use a date-only prefix like `20260311_` — Supabase uses the numeric prefix as the unique version ID and short names cause collisions and push failures.

Push with: `npm run supabase:push`

---

## Architecture

**Stack:** Next.js 16 (App Router) + Supabase + Tailwind CSS v4

**Auth flow:**

1. `app/login/page.tsx` — server action triggers Google OAuth via `supabase.auth.signInWithOAuth`
2. `app/auth/callback/route.ts` — exchanges OAuth code for session, redirects to `/dashboard`
3. `middleware.ts` — protects `/dashboard/*`, redirects authenticated users away from `/login`
4. `app/dashboard/page.tsx` — verifies session server-side, shows user info + sign-out

**Supabase clients:**

- `lib/supabase/server.ts` — async `createClient()` for Server Components and Server Actions (uses `@supabase/ssr`)
- `lib/supabase/client.ts` — `createClient()` for Client Components (browser)
- Always use `supabase.auth.getUser()` (not `getSession()`) for server-side auth checks

**Next.js 16 notes:**

- `params` and `searchParams` in page components are Promises — must be awaited
- Path alias `@/` maps to the repo root
