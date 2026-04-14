# Survivor Pool — Decision Log

Captures key decisions, the alternatives considered, and the reasoning. Newest first.

---

## 2026-04-13 — CSRF, rate-limit, and input-validation posture

**Decision:** Relied on Next.js 16's built-in server-action origin check for CSRF, added a DB-backed rate limiter keyed by `(user_id, action)`, and centralized form input validation in `lib/validation.ts`.

- **CSRF:** Next.js 16 validates the `Origin` header on every server-action request against the deployment host and rejects mismatches. It is on by default and not disabled here — `next.config.ts` sets no `experimental.serverActions.allowedOrigins` override. Actions in `lib/actions/*.ts` accept `FormData` from same-origin forms, which is the intended path. If a server action ever needs to be called cross-origin (e.g. from a different Vercel preview URL used by an embedded iframe), add the origin to `allowedOrigins` rather than disabling the check.
- **Rate limiting:** New `rate_limit_attempts` table + `lib/rate-limit.ts` helper using a count-within-window approach. RLS is enabled with **no policies** — only the service-role client can read or write. First use: `joinByInviteCodeAction` at 10 attempts / 10 min, which keeps 6-char alphanumeric invite codes (~2B combinations) infeasible to brute-force while allowing typo retries. Add more actions here by calling `checkRateLimit(admin, userId, "<action>", { max, windowSec })`.
- **Input validation:** `lib/validation.ts` exposes `requireString`, `requireInt`, `optionalUrl`, `optionalDate`. Admin actions (`createSeason`, `createContestant`, `createEpisode`, `recordElimination`, `lockEpisode`, `activateSeason`) now reject empty/oversized/malformed input before touching the DB. URLs are parsed with `new URL()` and restricted to `http(s)` to prevent `javascript:` or `data:` URLs from landing in `wiki_url` / `img_url` columns.

**Why this shape:**

- In-memory rate limiting is useless on Vercel's serverless runtime — every invocation is potentially a cold instance. Putting the counter in Postgres means a single source of truth across all lambdas.
- Keeping the `rate_limit_attempts` table policy-less (rather than writing "deny all" policies) matches the `pool_events` pattern: RLS on + no policies = admin-only access, nothing for a future contributor to accidentally loosen.
- Validators live outside the actions (not inline) so the rules are reusable and the action bodies stay focused on business logic.

**Alternative considered:** Upstash/Redis for rate limiting. Rejected for now — Postgres is already hot in every request, the extra ~5ms round-trip is negligible for form submissions, and not adding a third backing service keeps ops simple. Revisit if we need sub-second limits on high-frequency endpoints.

---

## 2026-04-10 — Realtime chat pattern, admin-client event inserts

**Decision:** Pool chat + activity feed (private pools only) is the first realtime feature. Pattern locked in for future uses of `supabase.channel()`:

- **Channel naming:** `pool:<poolId>`. One channel per pool page, subscribed in a client component's `useEffect` with cleanup that calls `supabase.removeChannel(channel)` on unmount.
- **Row filter:** `pool_id=eq.<N>` on each `postgres_changes` subscription. Supabase evaluates row filters against the publication, so the client only receives rows for the current pool.
- **Two-table merge:** `chat_messages` and `pool_events` are merged client-side via `mergeTimeline` (`lib/chat.ts`) ordered by `created_at` ascending, messages-before-events on ties. Both tables were added to the `supabase_realtime` publication in the migration.
- **Event inserts via admin client only:** `pool_events` has a SELECT-for-members RLS policy but no INSERT/UPDATE/DELETE policies. All writes go through `createAdminClient()` from server actions (`lib/pool-events.ts` helpers). This enforces the BACKLOG's "server-action / trigger only" rule without trusting the user JWT — the anon client simply cannot insert, so there's no way for a client to forge an event.
- **Chat message inserts via user client:** `chat_messages` uses standard per-row RLS (`user_id = auth.uid()` + membership check), mirroring `sole_survivor_picks`. Authors can delete their own messages; hard delete, no soft-delete column.

**Why this shape:**

- Admin-client-for-events keeps the event feed a system-of-record. If users could insert their own events, the whole "activity feed" abstraction breaks down — it would just be another message stream with extra metadata.
- User-client-for-messages preserves the existing RLS convention and lets Postgres enforce authorship. No special server-side checks needed for deletes.
- Channel-per-pool (rather than one global channel with server-side filtering) scales to many pools without fan-out waste and makes the cleanup story trivial.

**Alternative considered:** A single `pool_messages` table with a `kind` column discriminating chat vs. event. Rejected because chat messages and system events have very different access patterns (users write chat; server writes events) and putting them in the same table would have required per-row column-level checks to prevent users from forging `kind = 'event'` rows.

---

## 2026-03-23 — Removed custom avatar upload, kept built-in SVG avatars

**Decision:** Removed the custom file upload path from profile setup/edit. Users select from built-in SVG avatars only (`lib/avatars.ts`). The Supabase `avatars` storage bucket and its RLS policies are dropped via migration. The `avatar_url` column remains — it stores local paths like `/avatars/torch.svg`.

**Why:** The upload accepted files validated by MIME type only, not file content — a `.jpg` extension could carry non-image data. Rather than adding content validation (magic-byte checking, server-side re-encoding), the feature was removed entirely. The plan is to expand the curated avatar library over time, which eliminates the attack surface while still giving users personalization.

**Alternative considered:** Hardening the upload with magic-byte validation and server-side image re-encoding. Rejected as over-engineering for a feature that can be replaced by a growing set of curated SVGs with zero security surface area.

---

## 2026-03-23 — Server actions extracted to `lib/actions/`, standardized error handling

**Decision:** All server actions moved out of page files into dedicated `lib/actions/*.ts` files (`pools.ts`, `seasons.ts`, `contestants.ts`, `episodes.ts`, `allocations.ts`). Profile action already lived in `lib/actions/profile.ts`. Page files are now pure UI — they import and bind actions rather than defining them inline.

Error handling standardized around two conventions:

- **User-facing actions** (allocations, profile) return a discriminated union `ActionResult = { status: "ok" } | { status: "error"; error: string }` so the UI can display errors inline.
- **Admin actions** throw on failure (caught by error boundaries). Silent `return` on missing input replaced with explicit throws.

A shared `unwrap()` helper (`lib/supabase/unwrap.ts`) replaces the pattern of destructuring `{ data }` and silently ignoring Supabase errors. Used via `.then(unwrap)` in Promise.all chains.

A `requireActiveSeason()` utility (`lib/season-utils.ts`) replaces the repeated fetch-season-then-redirect pattern that appeared in 3+ files.

Duplicate rank calculation in `dashboard/page.tsx` replaced with `getUserRank()` from `lib/leaderboard.ts`.

HTML sanitizer in profile action changed from regex tag-stripping (`/<[^>]*>/g`) to stripping `<>` characters entirely — more robust against malformed tags.

**Why:** Page files were 200+ lines mixing data fetching, mutations, and UI. Extracting actions makes them independently testable, reusable, and keeps pages focused on rendering. Silent failures (ignored Supabase errors, no-op returns on bad input) masked bugs. The three error-handling patterns (throws, string returns, silent returns) were inconsistent and confusing.

**Alternative considered:** Centralizing all error handling into a single `withAction()` wrapper HOF. Rejected as over-abstraction — the two-convention split (throw for admin, ActionResult for user-facing) maps naturally to the two audiences and their error UX.

---

## 2026-03-20 — Design polish: scoped transitions, Teko buttons, ember glows

**Decision:** Replaced blanket `* { transition }` with scoped selector list (`body, .card, .btn, .input, ...`). Buttons now use Teko display font with uppercase/letter-spacing instead of inheriting body font. Added `--ember` and `--surface-raised` tokens, radius tokens (`--radius-sm/--radius/--radius-lg`), and utility classes (`.text-display`, `.text-label`, `.text-stat`, `.badge-*`, `.divider-accent`, `.glow-ember`, `.btn-torch`, `.card-torch`).

**Why:** The `*` transition caused every DOM element to animate on theme toggle — sluggish on tables/lists. Teko uppercase buttons are the single highest-impact Survivor branding change (challenge signage feel vs SaaS pills). Dark mode colors were too washed out; pushed contrast harder (`#141010` bg, brighter foreground). Ember glow on hover gives "approaching torch" feedback. All changes are CSS-only in `globals.css` — no React component modifications needed.

**Alternative considered:** Adding transitions per-component in Tailwind classes. Rejected because the scoped CSS selector approach is DRYer and catches elements we add later.

---

## 2026-03-20 — Button & input styling: CSS component classes over React wrappers

**Decision:** Button variants (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.btn-outline`) and form input styles (`.input`, `.select`) are defined as CSS component classes in `globals.css` rather than as React component wrappers.

**Why CSS classes:** All existing buttons are plain `<button>` elements in server components. Creating React wrapper components would require adding imports to 10+ files, and buttons in server components would need no "use client" boundary. CSS classes give the same reusability with zero import changes. Consistent with how typography (h1–h4) is already handled globally.

**Alternative considered:** React `<Button variant="primary">` component (shadcn/ui pattern). Rejected because it adds abstraction for something Tailwind handles well, and would require converting some server component files.

---

## 2026-03-20 — Font pairing: Teko + Barlow via next/font

**Decision:** Headings use **Teko** (condensed, angular), body uses **Barlow** (clean, industrial). Both loaded via `next/font/google` with CSS variables (`--font-display`, `--font-body`) registered as Tailwind v4 theme tokens (`font-display`, `font-body`). Base heading styles (h1–h4) set globally in `globals.css` with uppercase, tight line-height, and widened tracking.

**Why Teko:** Condensed display fonts evoke carved/stamped lettering — fits the Survivor tribal aesthetic. Teko is distinctive without being gimmicky, and has weights 400–700 for flexibility.

**Why global h1–h4 styles:** Ensures consistency without adding utility classes to every heading. Pages can still override with Tailwind classes when needed.

**Alternative considered:** Bebas Neue (too overused), Anton (single weight), local font files (unnecessary complexity when next/font handles optimization).

---

## 2026-03-19 — Defense-in-depth for admin routes: middleware + server action guards

**Decision:** Admin protection is enforced at three layers:

1. **Middleware** (`middleware.ts`) — queries `profiles.is_admin` and redirects non-admins away from `/admin/*`
2. **Layout** (`app/admin/layout.tsx`) — server-side `is_admin` check, redirect to `/dashboard`
3. **Server actions** — every admin server action calls `requireAdmin()` from `lib/admin-guard.ts` before doing anything

**Why three layers:** Server actions can be invoked directly (e.g. via crafted POST) without going through the page or layout. The layout alone is not sufficient. The middleware check is the first line of defense for page navigation, and `requireAdmin()` protects the actual mutations.

**Alternative considered:** Relying solely on the layout check + RLS. Rejected because admin actions use `createAdminClient()` (service role), which bypasses RLS entirely.

---

## 2026-03-18 — Use admin client for INSERT + SELECT when SELECT policy requires post-insert state

**Decision:** Any Server Action that inserts a row and needs to read it back (`.insert().select().single()`) must use the admin client if the table's SELECT policy depends on state that the insert hasn't established yet.

**Example:** `createPrivatePool` inserts into `pools` then reads back the new pool's ID. The `pools_read` policy only shows private pools to members. Since the user isn't a member at the moment of insert (that happens next via `joinPool`), the post-INSERT SELECT returns zero rows — Supabase treats this as an error, `createPrivatePool` returns `{ status: "error" }`, and `joinPool` never runs.

**Rule:** If a SELECT policy has a circular dependency on the outcome of the mutation itself (e.g. "you can read this row only after you've joined it"), use `createAdminClient()` for the insert+select step. The user client is still used for the subsequent join so that `pool_members_insert_self` (`WITH CHECK (user_id = auth.uid())`) is enforced normally.

**Affected patterns:**

- `createPrivatePool` — pool SELECT requires membership; membership doesn't exist yet at insert time
- `getPoolByInviteCode` in `joinByInviteCodeAction` — same policy, user isn't a member yet when looking up the code

---

## 2026-03-17 — Scraper uses MediaWiki API, not direct page fetch

**Decision:** Fetch wiki content via `{host}/api.php?action=parse&...` rather than scraping the rendered HTML page directly.

**Alternatives considered:**

- Direct `fetch(wikiUrl)` with browser-like User-Agent headers.

**Reasoning:** Fandom pages are behind Cloudflare which returns 403 for bare Node.js fetches regardless of headers. The MediaWiki API endpoint is not behind the same protection and returns clean JSON with pre-rendered HTML. We dynamically look up the "Castaways" section index first, then fetch only that section — avoids downloading the whole page and is more robust to page layout changes elsewhere.

---

## 2026-03-17 — Scraper upsert key: `wiki_slug` over `(season_id, name)`

**Decision:** Add a `wiki_slug` column to `contestants` and use it as the upsert key when importing from the Fandom wiki.

**Alternatives considered:**

- Upsert on `(season_id, name)` — simpler, no migration needed.

**Reasoning:** Contestant names on the wiki can be inconsistent between scrape runs (first name only vs full name, nicknames). The wiki page href slug (e.g. `Jenna_Lewis`) is stable, unique per person, and doubles as a backlink to their wiki page for future features (images, bio). A partial unique index (`WHERE wiki_slug IS NOT NULL`) keeps existing manually-entered rows unaffected.

---

## 2026-03-17 — Two-mode scraper design

**Decision:** The scraper is a single idempotent function that can be re-run at any point during the season. Rather than separate "initial" and "update" modes, all imports are upserts — safe to call after the premiere to seed data, and again each week to pick up eliminations and tribe changes.

**Alternatives considered:**

- Separate initial-import and weekly-update endpoints.

**Reasoning:** Keeping one code path reduces surface area. Idempotent upserts mean there's no "already initialised" state to manage. A weekly cron or manual admin trigger can call the same endpoint every time.

---

## 2026-03-17 — Scraper error strategy: throw on structure failure, warn on row failure

**Decision:** `scrapeContestants` throws if the page cannot be fetched or no wikitable is found. Individual row parse failures are collected in a `warnings` array and returned alongside the results.

**Alternatives considered:**

- Return empty results silently on any failure.
- Throw on any individual row error.

**Reasoning:** A structural failure (wrong URL, page redesign) should be loud — silently writing nothing to the DB would be worse than an error. Row-level failures are expected occasionally (header rows, recap links) and should not abort the whole import; surfacing them as warnings lets the admin see what was skipped.

---

## 2026-03-17 — Scraper lives in `lib/scraper.ts`, no DB calls

**Decision:** The scraper module is pure parsing logic. It returns structured data; the Route Handler (3.8) owns the DB upserts.

**Reasoning:** Separating fetch+parse from DB writes makes the scraper independently testable. The Route Handler can also apply additional validation before writing, and the same scraper output could be used for a dry-run/preview mode in future.

---

## 2026-03-13 — Service-role client is server-only, never in Client Components

**Decision:** `lib/supabase/admin.ts` imports `server-only` to hard-fail at build time if accidentally bundled for the browser.

**Reasoning:** The service-role key bypasses all RLS. A build-time error is far better than a runtime leak. All admin writes go through Server Actions or Route Handlers only.

---

## 2026-03-11 — Scoring via Postgres RPC, not application-layer aggregation

**Decision:** Scores are computed by a `get_pool_scores(p_pool_id)` Postgres function rather than fetching raw allocations and summing in TypeScript.

**Alternatives considered:**

- Fetch all allocations + eliminations and aggregate in the server component.

**Reasoning:** The join across allocations, eliminations, and profiles is exactly the kind of work Postgres is fast at. Keeping it in the DB means the leaderboard is a single RPC call regardless of pool size, and the logic lives in one place.

---

## 2026-03-11 — No separate `users` table; extend `auth.users` via `profiles`

**Decision:** User data lives in a `profiles` table that mirrors `auth.users.id`, auto-created via a trigger on signup.

**Reasoning:** Standard Supabase pattern. Keeps auth concerns in GoTrue and application data in the public schema under normal RLS rules. Avoids duplicating auth state.
