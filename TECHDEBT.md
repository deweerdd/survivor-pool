# Tech Debt

Tracked items from the 2026-04-14 code review. Tackle opportunistically or
promote to `BACKLOG.md` when they start blocking work.

## Atomicity

- [ ] **Pool join + event emission are non-atomic.** `lib/actions/pools.ts`
      inserts into `pool_members` then separately inserts a `pool_events`
      row; failure between the two diverges pool state from the chat
      timeline. Same pattern in `lib/actions/sole-survivor.ts` for
      `pick_changed`. Wrap both in a Postgres function.
- [ ] **`pool-events` insert errors are swallowed.** `lib/pool-events.ts`
      fire-and-forgets the insert. At minimum log the error; better, return
      it so the caller can decide.

## Type safety

- [ ] **Unsafe casts in pool detail page.** `app/dashboard/pools/[poolId]/page.tsx`
      uses `as unknown as ScoreRow[]` for RPC return rows. Generate RPC
      return types via `supabase gen types`, or add runtime guards in
      `lib/supabase/unwrap.ts`.

## Hardening

- [ ] **Rate-limit chat and allocation submits.** `lib/rate-limit.ts`
      currently only gates invite-code joins. Chat (`actions/chat.ts`) is
      the obvious spam vector; allocation updates should also be capped.
- [ ] **Document `catch {}` in `lib/supabase/server.ts:21`.** The swallow is
      intentional (cookie writes from RSC render), but unannotated — add a
      one-line comment so nobody "helpfully" adds a log that fires on every
      render.

## UI / a11y

- [ ] **Leaderboard table lacks a11y affordances.** Add `<caption>` or
      `aria-label="Pool leaderboard"` to the `<table>` in
      `app/dashboard/pools/[poolId]/page.tsx`.
- [ ] **`PoolChat` creates a Supabase client inside `useEffect`.** Hoist
      to module scope or `useMemo` so it's not recreated on every render.
      `components/PoolChat.tsx:112`.
