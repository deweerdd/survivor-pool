# Survivor Pool — v2 Feature Roadmap

Design and polish pass. Each feature is scoped for a single session.

---

## Phase 1: Design

- [x] **1.1 — Tailwind theme & color palette**
      Create a custom Tailwind theme with Survivor-inspired colors: jungle greens, earth browns, torch oranges, sand neutrals, dark charcoal backgrounds. Define semantic color tokens (primary, secondary, accent, surface, muted). Dark mode default with light mode toggle via next-themes.
      **Done when:** custom theme colors are available as Tailwind classes project-wide, dark/light toggle works.

- [x] **1.2 — Typography & fonts**
      Choose and integrate Google Fonts — a display font for headings (rugged/bold) and a clean body font. Set up heading hierarchy (h1–h4) with consistent sizing, weight, and spacing. Wire fonts through `next/font`.
      **Done when:** all headings and body text use the new font stack with clear hierarchy.

- [x] **1.3 — Button & form input styling**
      Define button variants: primary (torch orange), secondary (earth green), danger (red), ghost/outline. Style all form inputs (text fields, selects) with themed borders, focus rings, and consistent sizing. Apply across all existing forms.
      **Done when:** all buttons and inputs use consistent themed styles.

- [ ] **1.4 — Card & container components**
      Standardize reusable card/container styles for pool cards, leaderboard sections, and content panels. Add subtle shadows, themed borders, and background tints. Use consistently across dashboard, pools, and leaderboard pages.
      **Done when:** content sections use consistent card styling with themed borders/shadows.

- [ ] **1.5 — NavBar redesign (`components/NavBar.tsx`)**
      Restyle the nav bar with Survivor branding: themed background color, logo/wordmark placeholder, styled nav links with active state indicators, mobile hamburger menu with slide-out drawer. Sign-out button styled to match.
      **Done when:** nav bar looks themed on desktop and mobile, with working mobile menu.

- [ ] **1.6 — Footer & meta**
      Add a site footer with credits/links. Set favicon (torch or tribal icon). Add Open Graph meta tags for link sharing (title, description, image). Update `app/layout.tsx` metadata.
      **Done when:** site has footer, favicon, and OG tags for social sharing.

- [ ] **1.7 — Landing page (`app/page.tsx`)**
      Replace the current redirect-to-dashboard with a public landing page. Hero section with Survivor-themed imagery/background, app title and tagline, prominent "Sign in with Google" button, and a call-to-action to join a pool. Unauthenticated users see this; authenticated users redirect to `/dashboard`.
      **Done when:** unauthenticated visitors see a themed landing page with sign-in and CTA.

- [ ] **1.8 — Dashboard page redesign (`app/dashboard/page.tsx`)**
      Restyle the dashboard with themed cards for season info, pool summaries, and quick actions. Add visual hierarchy with section headings, icons, and color-coded status indicators. Improve the "allocate points" CTA prominence.
      **Done when:** dashboard has clear visual hierarchy with Survivor theming.

- [ ] **1.9 — Pools page redesign (`app/dashboard/pools/page.tsx`)**
      Themed pool cards with visual distinction between public and private pools. Improve create/join forms layout. Add pool member count badges, invite code display styling, and better empty-state messaging.
      **Done when:** pools page has polished, themed pool cards and forms.

- [ ] **1.10 — Leaderboard page redesign (`app/dashboard/pools/[poolId]/page.tsx`)**
      Themed leaderboard with rank badges (gold/silver/bronze for top 3), score highlighting, row hover effects, and tribe color accents. Style the "(you)" indicator. Improve score columns readability.
      **Done when:** leaderboard has visual polish with rank badges and themed styling.

- [ ] **1.11 — Allocation page redesign (`app/dashboard/pools/[poolId]/allocate/page.tsx`)**
      Restyle the allocation form with contestant cards (photo + name + tribe color), visual point distribution bars, clearer remaining-points indicator, and tribe grouping. Improve locked-episode read-only view.
      **Done when:** allocation form is visually engaging with contestant cards and point visualization.

- [ ] **1.12 — Loading & error state theming**
      Update `loading.tsx` skeletons and `error.tsx` boundary to match the Survivor theme. Themed spinner, skeleton pulse colors, and error recovery UI with consistent styling.
      **Done when:** loading and error states match the overall design language.

---

## Progress

**Current:** Phase 1 — features 1.1–1.3 complete.
**Next task:** 1.4 — Card & container components.
