# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run type-check   # TypeScript check (tsc --noEmit)
```

No test runner is configured yet.

## Environment

Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — from supabase.com project API settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from supabase.com project API settings
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never expose to client
- `NEXT_PUBLIC_SITE_URL` — e.g. `http://localhost:3000`

Also add `http://localhost:3000/auth/callback` as an allowed redirect URL in Supabase and enable Google OAuth provider.

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
