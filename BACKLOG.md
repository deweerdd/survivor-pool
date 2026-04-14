# Backlog

Prioritized task queue. Any Claude session can pick the next unassigned item. Mark items `[x]` when done and note the date.

Tasks should be self-contained: include enough context that an agent can start without asking questions.

---

## Priority: High (before public launch)

- [x] **Finale episode mode** (2026-04-08) — The final episode of a season works differently: instead of picking who gets eliminated, users pick who they think will win. Admin flags an episode as `is_finale` (new boolean column on `episodes`). When `is_finale` is true: (1) allocation UI changes copy to explain "pick who you think will win," (2) users still distribute 20 points across contestants and can spread across multiple to play the odds, (3) scoring inverts — only points placed on the sole winner pay out; points on non-winners are simply ignored (no penalty). Needs: migration to add `is_finale` to episodes, admin UI toggle, allocation page UI changes (banner/messaging), scoring logic update in `get_pool_scores` RPC or `buildLeaderboard`.
- [x] **Sole Survivor pick** (2026-04-08) — Each user can make a separate "Sole Survivor" pick per pool, betting on who will win the season. Worth 2 pts per episode remaining (inclusive of the episode the pick was made on). Picking earlier = more points. Users can change anytime but forfeit earlier-episode value. If their pick is eliminated, they get a nudge to pick a new one. Points only count after the finale once the winner is confirmed by admin.
  - **Data model:** New `sole_survivor_picks` table: `id`, `pool_id` (FK), `user_id` (FK), `contestant_id` (FK), `picked_at_episode` (int — episode number of the next unlocked episode when pick was made), `created_at`, `updated_at`. Unique on `(pool_id, user_id)` — one active pick per user per pool. Upsert on change.
  - **Scoring:** If picked contestant wins the finale: `2 × (total_episodes − picked_at_episode + 1)`. If picked contestant did not win (or no pick made): 0. Added to leaderboard total only after finale results are recorded.
  - **UI:** Pick interface accessible from pool page. Shows active contestants, current pick (if any), and projected points. After elimination of their pick, show a banner/nudge prompting a new pick.
  - **Sub-tasks:**
    - [x] Migration: create `sole_survivor_picks` table + RLS policies
    - [x] Business logic in `lib/sole-survivor.ts` (TDD): `calculateSoleSurvivorPoints`, `isPickEliminated`
    - [x] Server actions in `lib/actions/sole-survivor.ts`: `makeSoleSurvivorPickAction`
    - [x] UI: Sole Survivor pick section on pool detail page (`app/dashboard/pools/[poolId]/page.tsx`)
    - [x] Leaderboard integration: add sole survivor bonus to `buildLeaderboard` after finale
    - [x] Elimination nudge: detect when user's pick is eliminated and show prompt
- [ ] **CSRF protection on server actions** — Verify Next.js built-in origin checking is active and not bypassed. All `lib/actions/*.ts` accept bare `FormData` from forms.
- [ ] **Rate limiting on invite code guessing** — `joinByInviteCodeAction` has no throttle. 6-char alphanumeric codes are brute-forceable without limits. Add rate limiting via middleware or DB-level counter.
- [x] **Atomic allocation upsert** (2026-04-13) — Wrapped delete+insert in a new `replace_allocations(p_pool_id, p_episode_id, p_contestant_ids[], p_points[])` Postgres function (security invoker, so existing RLS still applies). `submitAllocation` in `lib/actions/allocations.ts` now calls the RPC — a failed insert rolls back the delete, so users can no longer be left with no allocation.
- [ ] **Input validation on admin forms** — `createSeason`, `createContestant`, `createEpisode` pass input straight to DB with no length/format validation. Add server-side checks before insert.
- [ ] **Cache or move middleware profile query** — Every protected route queries `profiles` for `is_admin` and `profile_complete`. No caching — latency/cost concern at scale, and a Supabase outage breaks all protected routes. Consider moving checks to layout level or caching via headers.
- [ ] **Pool chat & activity feed (private pools)** — Private pools get a realtime chat tab with inline activity events. Public pools are unchanged.
  - **Scope:** Private pools only (`pools.is_public = false`). Gate all reads/writes on that check + membership.
  - **Data model:**
    - New `chat_messages` table: `id`, `pool_id` (FK), `user_id` (FK), `body` (text, max 2000 chars), `created_at`, `edited_at` nullable. RLS: members of the pool can select; authors can insert/update/delete their own.
    - New `pool_events` table: `id`, `pool_id` (FK), `type` (enum: `pick_changed`, `achievement_earned`, `elimination_recap`, `member_joined`), `actor_user_id` nullable, `payload` jsonb, `created_at`. RLS: members can select; inserts are server-action / trigger only (no direct client write). Indexed on `(pool_id, created_at desc)`.
  - **Realtime:** First realtime feature in the app. Use `supabase.channel('pool:<poolId>').on('postgres_changes', ...)` subscribed to inserts on both tables filtered by `pool_id`. New client component `components/PoolChat.tsx` merges the two streams in timestamp order. Unsubscribe on unmount.
  - **Event emission:**
    - `lib/actions/sole-survivor.ts` → after successful upsert, insert `pool_events` rows of type `pick_changed` for every pool the user belongs to in that season. Payload: `{ contestant_name, previous_contestant_name, episode_number }`. Note: there is no pre-existing audit log of pick changes, so events only start flowing once this ships — no backfill.
    - Achievement-earned events: emitted by the achievements check (see Achievements entry). Payload: `{ achievement_key, achievement_label }`.
    - Elimination recap events: emitted once per episode when admin records the last elimination of that episode, or lazily when the recap card is first rendered. Payload: `{ episode_number, eliminated_contestant_names }`.
    - Member joined events: emitted from `joinPool` / `joinByInviteCodeAction` in `lib/pools.ts`.
  - **UI:** New tab on the pool page (`app/dashboard/pools/[poolId]/page.tsx`) — "Leaderboard | Chat". Chat tab only renders for private pools; for public pools the tab is hidden entirely. Chat page loads last 50 messages+events server-side, then subscribes client-side for new rows. Input at bottom, 2000-char limit, server action `sendChatMessageAction` in `lib/actions/chat.ts`. Render event items with a distinct style (icon, muted background, no avatar needed).
  - **Moderation (v1):** message authors can delete their own messages. No admin/mod tooling yet — revisit after launch.
  - **Files:**
    - Migration: `supabase/migrations/<timestamp>_create_chat_messages_and_pool_events.sql`
    - `lib/chat.ts` — pure helpers (message validation, merge-sort chat + events) — TDD with Vitest
    - `lib/actions/chat.ts` — `sendChatMessageAction`, `deleteChatMessageAction`
    - `components/PoolChat.tsx` — client component, realtime subscription
    - Modify `app/dashboard/pools/[poolId]/page.tsx` — tab switcher
    - Modify `lib/actions/sole-survivor.ts`, `lib/pools.ts` — emit events
    - Regenerate `lib/supabase/database.types.ts` after migration
    - Document the realtime pattern in `decisions.md` (first in codebase)
  - **Out of scope:** DMs, file attachments, reactions, mentions, unread counts, admin moderation tools.

## Priority: Medium

- [x] **Auto-lock episodes before air time** (2026-04-07) — Episodes should auto-lock 1 hour before airing (Wednesdays 8pm ET → lock at 7pm ET). Implement request-time auto-locking: `autoLockEpisodes()` runs on allocate page load, allocation submission, and admin episodes page. Uses `air_date` from the episodes table + ET timezone math to determine lock time. Flips `is_locked = true` via admin client. No cron needed — idempotent, runs server-side on every relevant page load. New files: `lib/lock-utils.ts`, `lib/actions/auto-lock.ts`. Modified: `lib/episode-utils.ts`, `lib/actions/allocations.ts`, `app/admin/episodes/page.tsx`. Plan: `.claude/plans/partitioned-inventing-penguin.md`.
- [ ] **Security headers (CSP, X-Frame-Options)** — No Content Security Policy or frame protection configured in `next.config.ts`. Add `headers()` config.
- [ ] **RLS integration tests** — Architecture relies on RLS for data isolation, but no tests confirm policies work as expected. Add tests that verify access as different user roles.
- [ ] **Admin audit logging** — Admin actions (activate season, record elimination, lock episode) have no audit trail. Log who did what and when — either a DB table or structured logging.
- [ ] **Weekly recap card on pool page** — Dismissible card above the leaderboard summarizing the most recent locked episode for the current user. Lives with the leaderboard.
  - **Content:**
    - Episode number + title (e.g., "Episode 7 recap")
    - Who was eliminated that episode (contestant names + images)
    - Current user's points earned that episode (e.g., "You earned 8 points")
    - Top scorer in the pool that episode (display name + points)
    - If the user's sole survivor pick was eliminated that episode, highlight it prominently with a link to pick a new one (reuses the existing nudge banner logic in `app/dashboard/pools/[poolId]/page.tsx`)
  - **Data source:** New sibling RPC `get_pool_episode_scores(p_pool_id, p_episode_id)` — preferred over adding a param to `get_pool_scores` to avoid breaking existing callers in `lib/leaderboard.ts`. Eliminations come from `eliminations` joined to `contestants`.
  - **Which episode:** The most recent `episodes` row where `is_locked = true` for this pool's season. If no episode is locked yet, do not render the card.
  - **Dismissal:** Per-user, per-episode via `localStorage` key `recap-dismissed-<poolId>-<episodeId>` — no new table needed. Next episode's recap shows again automatically.
  - **Placement:** New component `components/WeeklyRecapCard.tsx` rendered in `app/dashboard/pools/[poolId]/page.tsx` between the header buttons and the leaderboard table.
  - **Files:**
    - Migration: `supabase/migrations/<timestamp>_create_get_pool_episode_scores_rpc.sql`
    - `lib/weekly-recap.ts` — pure recap data assembly (TDD: given scores + eliminations + user id, return recap view model)
    - `components/WeeklyRecapCard.tsx` — client component for dismissal state
    - Modify `app/dashboard/pools/[poolId]/page.tsx` — fetch + render
  - **Interaction with chat:** When both features exist, also emit a `pool_events` row of type `elimination_recap` so the event appears inline in chat. The card is independent of chat and can ship first.
- [ ] **How to Play page** — Static explainer page covering the game mechanics. Removes the "how does this work?" friction for new pool members.
  - **Route:** `app/dashboard/how-to-play/page.tsx` (Server Component, static content). Protected by the existing `/dashboard/*` middleware.
  - **Content sections:**
    1. **The basics** — joining a pool, episodes, the weekly loop
    2. **Allocating points** — you get 20 points per episode, distribute across contestants you think will be eliminated, points pay out if that contestant is eliminated that episode
    3. **Sole Survivor** — one season-long pick per pool, worth 2 pts × episodes remaining when picked, earlier = more, only pays out after the finale
    4. **Finale mode** — scoring inverts: points on the actual winner pay out instead of the eliminated
    5. **Leaderboards & rank** — how ties are broken (alphabetical by display name), sole survivor bonus displayed separately until finale
    6. **Pools** — public vs private, invite codes
  - **Links in:**
    - Add "How to Play" link to `components/NavBar.tsx` (desktop nav + mobile drawer), between Dashboard and Admin
    - Add a dismissible "New here? Read the rules" callout on `app/dashboard/page.tsx` linking to the page — show only when the user has no allocations yet (first-time users)
  - **Styling:** Match existing torch card headings + stone text tokens. No interactive tour, no logged-out variant — scoped to authenticated users.
  - **Files:**
    - `app/dashboard/how-to-play/page.tsx` — new
    - Modify `components/NavBar.tsx` — add link
    - Modify `app/dashboard/page.tsx` — conditional callout
  - **Out of scope:** public/logged-out version at `/how-to-play`, interactive onboarding tour, per-section deep links.

## Priority: Low

- [ ] **Achievements (points milestones, v1)** — Lightweight reward loop. Users earn achievements within a specific pool/season but display them globally as an avatar frame/ring wherever their avatar renders.
  - **v1 achievement list (points milestones only):**
    - `pts_50_season` — "Scored 50 points in a season"
    - `pts_100_season` — "Scored 100 points in a season"
    - `pts_200_season` — "Scored 200 points in a season"
  - Explicitly deferred to later iterations: streaks, lucky picks (all-in bets that hit), sole-survivor-winner, lifetime/global achievements. Do **not** add these in v1.
  - **Data model:**
    - New `achievements` table (catalog): `key` (PK, text), `label`, `description`, `frame_asset` (text — CSS class or image key for the avatar ring). Seeded via migration.
    - New `user_achievements` table: `id`, `user_id`, `pool_id`, `season_id`, `achievement_key` (FK), `earned_at`. Unique on `(user_id, pool_id, achievement_key)` to prevent duplicates within the same pool/season. RLS: users can select their own + fellow pool members'.
  - **Detection:** Check on every successful allocation submission (in `lib/actions/allocations.ts` after the insert). New `lib/achievements.ts` function `checkAndAwardAchievements(userId, poolId)`:
    1. Queries `get_pool_scores` for the user's current total in that pool
    2. For each milestone not yet in `user_achievements`, inserts a row via the admin client
    3. Inserts a `pool_events` row of type `achievement_earned` (only if chat/events shipped) so it appears in chat
  - **Display:**
    - Extend `components/UserAvatar.tsx` to accept an optional frame prop and render a colored ring/frame around the avatar. Source: query `user_achievements` for the user, pick the highest-tier milestone globally (across all pools).
    - Leaderboard rows, chat messages, and the profile page all automatically get the ring since they all use `UserAvatar`.
    - New profile achievements section (either on `app/profile/edit/page.tsx` or a new `app/profile/page.tsx`) listing earned achievements grouped by season.
  - **Files:**
    - Migration: `supabase/migrations/<timestamp>_create_achievements_tables.sql` (catalog + user_achievements + seed rows + RLS)
    - `lib/achievements.ts` — pure logic for `checkAndAwardAchievements`, highest-tier selection (TDD)
    - Modify `lib/actions/allocations.ts` — hook the check in after allocation insert
    - Modify `components/UserAvatar.tsx` — accept + render frame
    - New profile achievements section
    - Regenerate `lib/supabase/database.types.ts`
  - **Dependency:** Achievement-earned chat notifications depend on the chat/events feature shipping first, but the achievement itself is independent — ship the award logic and avatar frame even if chat isn't ready. The `pool_events` insert can be added incrementally.
- [ ] **Mobile nav drawer focus trap** — When the mobile nav drawer is open in `components/NavBar.tsx`, keyboard focus can escape behind the overlay. Should trap focus inside the drawer while open and restore focus to the hamburger button on close. Consider using a small focus-trap utility or `inert` on the main content.
- [ ] **`:focus-visible` fallback on `.btn`/`.input`** — `globals.css` uses `outline: none` with a custom `:focus-visible` ring. Works in modern browsers, but leaves no fallback for older assistive tech. Refactor to keep a subtle native focus indicator or use `:focus` with `:focus:not(:focus-visible)` override.
- [ ] **Breadcrumbs on deep pool pages** — Pool > Leaderboard > Allocate is 3 levels deep. Current back buttons work but don't show hierarchy. Add a breadcrumb component above the `<h1>` on `/dashboard/pools/[poolId]/allocate` and `/dashboard/pools/[poolId]/sole-survivor`.
- [ ] **Dark mode** — All color tokens in `globals.css` are light-only. Add a dark variant via `@media (prefers-color-scheme: dark)` or a `[data-theme="dark"]` class. Design dark values together with light to keep contrast parity. Test torch theme still reads well.
- [ ] **Landing nav background on scroll** — Fixed nav at top of `/` (`app/page.tsx`) has no background, so text overlaps hero content when scrolling. Add a subtle blur/fill that appears after scroll.
