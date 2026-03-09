# ADR 001: Supabase over Prisma + separate auth

**Date**: 2024-03-01
**Status**: Accepted

## Context
We need a database, auth, and storage solution for a small-to-medium web app.

## Decision
Use Supabase for both database (Postgres) and auth (Google OAuth).

## Reasons
- **Integrated auth**: Supabase Auth handles Google OAuth out of the box — no need to manage sessions, JWTs, or callback logic manually.
- **Row Level Security**: Supabase's RLS lets us enforce data access rules at the DB level, reducing the chance of accidentally exposing data.
- **Real-time potential**: Can add live leaderboard updates later without changing the architecture.
- **Type generation**: `supabase gen types typescript` keeps our TypeScript types in sync with the actual schema automatically.
- **Managed hosting**: No need to run our own Postgres in production.

## Trade-offs
- Vendor lock-in to Supabase's hosted service.
- RLS policies can be complex to debug.
- Prisma would give us a nicer query API but adds complexity and a second system.
