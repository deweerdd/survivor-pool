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
