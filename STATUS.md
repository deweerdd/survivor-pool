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
