# Session Status

Each Claude session writes an entry here when finishing work. The next session reads this first.

Format:

```
## YYYY-MM-DD — [short title]
**Branch:** [branch name]
**What was done:** [bullet list]
**Unfinished / blocked:** [anything the next session should pick up]
**Gotchas:** [anything surprising discovered during the session]
```

---

<!-- Newest entries at the top -->

## 2026-04-14 — Rate-limit chat + allocation submits

**Branch:** refactor/unify-actions-and-dashboard-rpc
**What was done:**

- `lib/actions/chat.ts` — `sendChatMessageAction` now calls `checkRateLimit(admin, user.id, "send_chat_message", { max: 30, windowSec: 60 })` before the pool/membership checks. Over-limit throws a user-facing "too quickly" error surfaced by `withAction`.
- `lib/actions/allocations.ts` — `submitAllocation` now rate-limited at 60 / 5 min with action key `submit_allocation`. Users routinely tweak allocations, so the cap is generous; it only bites scripted abuse.
- Both actions use `createAdminClient()` because `rate_limit_attempts` has RLS on with no policies.
- DoD green.

**Unfinished / blocked:** 2 tech-debt items remain: atomic pool-join + event emission (Postgres function) and RPC return-type generation / runtime guards.

**Gotchas:**

- Picked `max: 30 / 60s` for chat deliberately (not 10/60 or similar). Real conversation in a small pool can spike — a quick back-and-forth between two people easily hits 10–15 msgs/min. The limit is about flooding, not pacing.
- The rate-limit check runs *before* the pool/membership validation, so an unauthorized user who spams the endpoint still counts toward their own limit. That's fine — it's the same user id either way.

## 2026-04-14 — Tech debt pass: pool-events logging, PoolChat client hoist, a11y label, server.ts comment

**Branch:** refactor/unify-actions-and-dashboard-rpc
**What was done:**

- `lib/pool-events.ts` — both emitters now capture the Supabase error return and `console.error` with pool/type context. Non-fatal (primary action already committed) but the divergence is now traceable instead of silent.
- `components/PoolChat.tsx` — hoisted `createClient()` out of the subscription `useEffect` into a `useMemo(() => createClient(), [])`. No more per-render client instantiation; effect deps updated to include `supabase`.
- `app/dashboard/pools/[poolId]/page.tsx` — added `aria-label="Pool leaderboard"` to the leaderboard `<table>`.
- `lib/supabase/server.ts` — documented the `catch {}` in `setAll` with an explicit "do not log" warning (fires on every RSC render).
- BACKLOG updated (4 tech-debt items checked off). DoD green: format, type-check, eslint (app/lib), format:check, 49 unit tests.

**Unfinished / blocked:** 3 tech-debt items remain in BACKLOG: atomic pool-join + event emission (Postgres function), rate-limit chat/allocation submits, generate/guard RPC return types.

**Gotchas:**

- Running eslint against `components/` surfaces a pre-existing error in `PoolChat.tsx:41` (setState in effect inside `TimeLabel`). Not introduced by this pass — CLAUDE.md's DoD only lints `app lib`, so it hasn't been caught. Worth adding `components` to the DoD command separately.

## 2026-04-14 — Security headers + middleware profile cache

**Branch:** refactor/unify-actions-and-dashboard-rpc
**What was done:**

- **Security headers (`next.config.ts`):** added `Content-Security-Policy`, `Strict-Transport-Security`, and `Permissions-Policy` alongside the existing X-Frame-Options / X-Content-Type-Options / Referrer-Policy. CSP derives the Supabase host from `NEXT_PUBLIC_SUPABASE_URL` at build time for `img-src` / `connect-src` (incl. `wss:` for realtime). Dev also allows `'unsafe-eval'` for Next.js HMR; prod does not.
- **Middleware caching (`middleware.ts`):** early-return on `/login` (no profile query needed once we know `user` exists), and added a module-level `Map<userId, {profile, expires}>` with a 30s TTL for the `is_admin`/`profile_complete` lookup. On profile-query error, we now fall through to the page instead of redirecting — a transient Supabase blip no longer 500s every protected route.
- DoD green: format, type-check, eslint, format:check, 49 unit tests.

**Unfinished / blocked:** CSP uses `'unsafe-inline'` for scripts because Next.js emits inline hydration scripts; switching to nonces would require `headers()` → middleware nonce injection and is a separate chunk of work.

**Gotchas:**

- The profile cache is per-Node-instance (module-level `Map`). That's fine for a single Vercel lambda but means a user who toggles `is_admin` may still see the old value for up to 30s on another instance. Acceptable for now since admin assignment is infrequent and admin actions are re-checked server-side inside each admin action/page.
- CSP `connect-src` must include `wss://` for the Supabase realtime channel used by `PoolChat`. Dropping the wss entry silently breaks chat in prod while leaving the rest of the app functional — watch for that if anyone edits the policy.

## 2026-04-13 — High-priority security: CSRF, rate limit, input validation

**Branch:** master
**What was done:**

- **Input validation (`lib/validation.ts`):** new `requireString` / `requireInt` / `optionalUrl` / `optionalDate` helpers. Wired into all admin actions in `lib/actions/seasons.ts`, `contestants.ts`, `episodes.ts`. `optionalUrl` parses via `new URL()` and restricts to `http:` / `https:` — blocks `javascript:` / `data:` URLs landing in `wiki_url` / `img_url`.
- **Rate limiting:** migration `20260413130000_create_rate_limit_attempts.sql` adds a policy-less (admin-only) table. New `lib/rate-limit.ts#checkRateLimit` does a count-within-window check then logs. `joinByInviteCodeAction` now throttles at 10 / 10 min, redirecting over-limit attempts to `/dashboard?error=rate_limited`. Dashboard UI shows a callout for the new error. Types added manually to `database.types.ts`.
- **CSRF:** verified Next.js 16 enforces `Origin`-header checking on server actions by default. No `experimental.serverActions.allowedOrigins` override in `next.config.ts`, so same-origin-only is the posture. Documented in `decisions.md`.
- DoD: format, type-check, eslint, format:check, 49 unit tests all green. Migration pushed to remote.

**Unfinished / blocked:** Item #4 in the High section (middleware profile query caching) deliberately skipped — user asked to stop at items 1–3.

**Gotchas:**

- `rate_limit_attempts` must be accessed through the service-role (admin) client — RLS is on with no policies, so the anon client gets zero rows back. Calling it from the user client would silently count as 0 and never trigger the limit.
- 10 attempts / 10 min is deliberately generous for legitimate typo retries; the real protection comes from the ~2B combination space of the 6-char code. If we ever shorten codes, the limit needs to tighten.

## 2026-04-13 — Atomic allocation upsert

**Branch:** master
**What was done:**

- New migration `20260413120000_create_replace_allocations_rpc.sql` — creates `replace_allocations(p_pool_id, p_episode_id, p_contestant_ids[], p_points[])` plpgsql function. `security invoker` so existing RLS policies on `allocations` still enforce unlock + ownership. Validates total=20 and equal-length arrays; deletes then inserts in a single transaction.
- `lib/actions/allocations.ts` — swapped the unsafe delete-then-insert pair for a single `supabase.rpc("replace_allocations", ...)` call. The auth/membership/lock pre-checks are preserved as fast-fail guards; the RPC re-validates as defense in depth.
- Regenerated `database.types.ts` by hand (added `replace_allocations` to `Functions`).
- Migration pushed to remote via `npm run supabase:push`.
- DoD green: format, type-check, eslint, format:check, 49 unit tests.

**Unfinished / blocked:** Nothing.

**Gotchas:**

- `security invoker` is important here — if we had used `security definer` the RLS lock check would have been bypassed, letting users mutate allocations on locked episodes. The pre-check in the action is not sufficient on its own because a race could lock between check and write.
- `unnest(arr1, arr2)` only works when both arrays have the same length, so the function validates that up front to give a clear error rather than a cryptic "query returned no rows".

## 2026-04-10 — Dead code cleanup

**Branch:** feature/ui-redesign
**What was done:**

- Deleted `components/ThemeProvider.tsx` — orphaned `next-themes` wrapper that was never imported anywhere. Set `forcedTheme="light"` so it wasn't providing any dark-mode behavior either.
- Uninstalled `next-themes` dependency
- Removed unused CSS from `app/globals.css`: `@keyframes pulse-glow` (not referenced) and `.delay-100/300/400/500` utility classes (only `.delay-200` is used in the codebase)
- DoD: format, type-check, lint, format:check, and 37 unit tests all green

**Unfinished / blocked:** Nothing.
**Gotchas:** None — all removals were verified with grep before deletion.

## 2026-04-10 — UI/UX audit & accessibility fixes

**Branch:** feature/ui-redesign
**What was done:**

- Ran UI/UX audit using `ui-ux-pro-max` skill against existing pages/components
- **Accessibility fixes:**
  - Added `@media (prefers-reduced-motion: reduce)` in `globals.css` to disable all animations (torch flicker, scroll hint, ember particles, transitions)
  - Darkened `--muted-foreground` from `#78716c` to `#57534e` (stone-600) to meet WCAG AA 4.5:1 contrast on the cream background
  - Added `sr-only` `<label>` elements to "Invite code" and "Pool name" inputs on dashboard
  - Added `scope="col"` to leaderboard `<th>` elements
  - Added `aria-hidden="true"` to decorative SVG icons on dashboard
- **Touch/interaction:**
  - Increased `gap-1` → `gap-2` between allocation +/- buttons (meets 8px min spacing)
  - Added `:active` tap feedback on `.card-hover` and `.pool-card` for mobile press state
- **Visual fix:** `.card-torch` was using `border-image` for its gradient top stripe, which broke `border-radius` on the top corners in all browsers. Replaced with an absolutely-positioned `::before` pseudo-element + `overflow: hidden`
- **Routing:** Replaced `<a href>` with Next.js `<Link>` in `app/dashboard/pools/[poolId]/page.tsx` (Dashboard back link, Allocate button, Sole Survivor button, "Pick a new one" inline link) — now client-side navigation
- **Loading feedback:** Created `components/SubmitButton.tsx` using `useFormStatus`. Wired into Join Pool, Join by Invite Code, and Create Pool forms on dashboard — buttons now disable and show pending text ("Joining..." / "Creating...") during server action
- DoD: format, type-check, lint, format:check all green

**Unfinished / blocked:** Nothing blocking. Deferred lower-priority audit items tracked in BACKLOG.md (mobile nav focus trap, `:focus-visible` fallback on `.btn`/`.input`, breadcrumbs, dark mode).

**Gotchas:**

- `border-image` silently disables `border-radius` on the bordered side — easy to miss visually because the rest of the card still looks rounded. Pseudo-element approach is the safest workaround.
- Tailwind v4 ships `sr-only` out of the box, no config needed.
- `useFormStatus` must be called from a child component inside the `<form>` — that's why `SubmitButton` is its own client component rather than inlined.

## 2026-04-08 — Finale episode mode

**Branch:** master
**What was done:**

- Added `is_finale` boolean column to `episodes` table (migration pushed)
- Updated `get_pool_scores` RPC to handle finale scoring: normal episodes earn points on eliminated contestants, finale episodes earn points on non-eliminated contestants (the winner). Uses UNION ALL approach.
- Admin episodes page: "Finale" checkbox on create form, purple "Finale" badge on episode cards
- Allocation UI: finale banner explaining the mechanic ("pick who will win"), header changes to "Finale — Pick the Winner"
- Updated `database.types.ts` with `is_finale` field
- Fixed pre-existing `drop_avatars_bucket` migration that was blocking pushes (Supabase disallows direct storage table deletes)

**Unfinished / blocked:** Nothing
**Gotchas:**

- Finale scoring works by inversion: admin records eliminations for all runner-ups (same workflow as normal episodes). The one contestant with no elimination record is the winner. No new "winner" column needed.
- The `drop_avatars_bucket` migration was blocking all pushes — direct `DELETE FROM storage.objects` is disallowed by Supabase. Fixed by removing the direct deletes and adding a comment to use the dashboard instead.

## 2026-04-08 — Vercel production deployment

**Branch:** master
**What was done:**

- Deployed app to Vercel at `https://survivor-pool-six.vercel.app`
- Added `lib/site-url.ts` with `getSiteUrl()` helper — resolves URL across local dev, Vercel production, and preview deploys (NEXT_PUBLIC_SITE_URL → VERCEL_URL → localhost fallback)
- Updated `app/layout.tsx` and `app/login/page.tsx` to use `getSiteUrl()` instead of raw env var
- Configured Supabase auth redirect URLs for both local and production
- Walked through full Vercel setup: env vars, Supabase auth config, Google OAuth

**Unfinished / blocked:** Nothing
**Gotchas:**

- `NEXT_PUBLIC_SITE_URL` must include `https://` — without it, `new URL()` in `metadataBase` throws `ERR_INVALID_URL` and the build fails silently on Vercel
- Supabase redirect URLs support multiple entries — keep both localhost and production URLs for local dev to keep working

## 2026-04-07 — Auto-lock episodes before air time

**Branch:** master
**What was done:**

- Implemented request-time auto-locking: episodes auto-lock 1 hour before airing (7pm ET on `air_date`)
- New `lib/lock-utils.ts` — `getLockTime()` and `isEpisodePastLockTime()` with EST/EDT handling
- New `lib/actions/auto-lock.ts` — `autoLockEpisodes()` idempotent batch lock via admin client
- Integrated into `lib/episode-utils.ts`, `lib/actions/allocations.ts`, `app/admin/episodes/page.tsx`
- Ran `npm run format` to fix pre-existing Prettier issues across the project
- Marked task complete in `BACKLOG.md`
- Pushed to origin/master (`4212996`)
  **Unfinished / blocked:** Nothing
  **Gotchas:**
- `air_date` is a `date` type (no time). Lock time is derived by assuming 8pm ET air time minus 1 hour. If CBS ever changes the time slot, update `getLockTime()` in `lib/lock-utils.ts`.
- The auto-lock relies on `air_date` being populated — all episodes are scraped from the wiki so this is always set.
