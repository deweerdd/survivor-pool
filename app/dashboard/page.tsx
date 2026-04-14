// Server component — auth gate handled by app/dashboard/layout.tsx
import { requireUser } from "@/lib/auth-utils";
import { getActiveSeason } from "@/lib/season-utils";
import { getNextOpenEpisode } from "@/lib/episode-utils";
import { isMember, type PoolWithMembers } from "@/lib/pools";
import {
  joinPoolAction,
  joinByInviteCodeAction,
  createPrivatePoolAction,
} from "@/lib/actions/pools";
import { unwrap } from "@/lib/supabase/unwrap";
import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, user } = await requireUser();
  const season = await getActiveSeason(supabase);

  if (!season) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        <h1>Dashboard</h1>
        <div className="card-flat py-10 text-center">
          <p className="text-muted-foreground">No active season right now.</p>
        </div>
      </main>
    );
  }

  const [mySummaries, openEpisode, allPools, memberCounts] = await Promise.all([
    supabase.rpc("get_user_pool_summaries", { p_user_id: user.id }).then(unwrap),
    getNextOpenEpisode(supabase, season.id),
    supabase
      .from("pools")
      .select("*, pool_members(user_id)")
      .eq("season_id", season.id)
      .then(unwrap),
    supabase.rpc("get_pool_member_counts", { p_season_id: season.id }).then(unwrap),
  ]);

  const countMap = new Map<number, number>(memberCounts.map((r) => [r.pool_id, r.member_count]));

  const myPools = mySummaries.map((s) => ({
    poolId: s.pool_id,
    poolName: s.pool_name,
    isPublic: s.is_public,
    inviteCode: s.invite_code,
    rank: s.user_rank,
    totalPoints: s.user_points ?? 0,
    memberCount: s.member_count,
  }));

  // Public pools user hasn't joined yet
  const unjoinedPublicPools = (allPools as PoolWithMembers[]).filter(
    (p) => p.is_public && !isMember(p, user.id)
  );

  const shouldOpenFindPool = myPools.length === 0 || !!error;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 space-y-8">
      {/* ── Zone 1: Allocate Banner ── */}
      {openEpisode && myPools.length > 0 && (
        <section className="stagger-children space-y-3">
          {myPools.map((p) => (
            <Link
              key={p.poolId}
              href={`/dashboard/pools/${p.poolId}/allocate`}
              className="card-torch flex items-center justify-between gap-3 no-underline hover:opacity-90 transition-opacity"
            >
              <p className="text-foreground">
                Allocate your points for <strong>Episode {openEpisode.episode_number}</strong> in{" "}
                {p.poolName}
              </p>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-primary"
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </section>
      )}

      {/* ── Zone 2: My Pools ── */}
      <section className="space-y-4">
        <h2>My Pools</h2>

        {myPools.length === 0 ? (
          <div className="card-flat py-12 text-center space-y-4">
            <div className="flex justify-center">
              <svg
                width="48"
                height="80"
                viewBox="0 0 48 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-30"
                aria-hidden="true"
              >
                <path
                  d="M24 0C24 0 32 12 32 20C32 25 29 28 26 30L28 50H20L22 30C19 28 16 25 16 20C16 12 24 0 24 0Z"
                  fill="currentColor"
                />
                <rect x="20" y="50" width="8" height="26" rx="2" fill="#44403c" />
                <rect x="18" y="74" width="12" height="4" rx="1" fill="#44403c" />
              </svg>
            </div>
            <h3 className="text-muted-foreground">Your torch isn&apos;t lit yet</h3>
            <p className="text-muted-foreground text-sm">Join a pool below to start playing.</p>
          </div>
        ) : (
          <div className="stagger-children space-y-3">
            {myPools.map((p) => (
              <Link key={p.poolId} href={`/dashboard/pools/${p.poolId}`} className="pool-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg">{p.poolName}</h3>
                    <span className="badge badge-secondary">{p.memberCount} members</span>
                    {!p.isPublic && p.inviteCode && (
                      <span className="badge badge-accent">Code: {p.inviteCode}</span>
                    )}
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
                <hr className="divider mb-3" />
                <div className="flex gap-8">
                  <div>
                    <p className="text-label">Rank</p>
                    <p className="text-display text-2xl font-bold">
                      {p.rank !== null ? `#${p.rank}` : "\u2014"}
                    </p>
                  </div>
                  <div>
                    <p className="text-label">Points</p>
                    <p className="text-display text-2xl font-bold">{p.totalPoints}</p>
                  </div>
                  {openEpisode && (
                    <div className="ml-auto flex items-center">
                      <span className="badge badge-primary">
                        Ep. {openEpisode.episode_number} Open
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Zone 3: Find a Pool ── */}
      <details {...(shouldOpenFindPool ? { open: true } : {})}>
        <summary className="text-lg font-semibold cursor-pointer select-none py-2">
          Find a Pool
        </summary>
        <div className="space-y-6 mt-4">
          {/* Unjoined public pools */}
          {unjoinedPublicPools.length > 0 && (
            <section>
              <h3 className="mb-3">Public Pools</h3>
              <ul className="space-y-3">
                {unjoinedPublicPools.map((pool) => (
                  <li
                    key={pool.id}
                    className="card-torch card-hover flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-lg">{pool.name}</span>
                      <span className="badge badge-secondary">
                        {countMap.get(pool.id) ?? 0} members
                      </span>
                    </div>
                    <form action={joinPoolAction.bind(null, pool.id)}>
                      <SubmitButton className="btn btn-torch" pendingText="Joining...">
                        Join Pool
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Join by invite code */}
          <section className="card-torch">
            <h3 className="mb-1">Join a Private Pool</h3>
            <hr className="divider-accent my-4" />
            <form action={joinByInviteCodeAction} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label htmlFor="inviteCode" className="sr-only">
                  Invite code
                </label>
                <input
                  id="inviteCode"
                  type="text"
                  name="inviteCode"
                  required
                  placeholder="Invite code"
                  className="input uppercase"
                />
              </div>
              <SubmitButton className="btn btn-primary" pendingText="Joining...">
                Join
              </SubmitButton>
            </form>
            {error === "invalid_code" && (
              <div className="callout callout-danger mt-3">
                Invalid invite code. Please try again.
              </div>
            )}
            {error === "rate_limited" && (
              <div className="callout callout-danger mt-3">
                Too many attempts. Please wait a few minutes and try again.
              </div>
            )}
            {error === "no_season" && (
              <div className="callout callout-danger mt-3">
                No active season. Cannot create a pool right now.
              </div>
            )}
          </section>

          {/* Create private pool */}
          <section className="card">
            <h3 className="mb-1">Create a Private Pool</h3>
            <hr className="divider my-3" />
            <form action={createPrivatePoolAction} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label htmlFor="poolName" className="sr-only">
                  Pool name
                </label>
                <input
                  id="poolName"
                  type="text"
                  name="name"
                  required
                  placeholder="Pool name"
                  className="input"
                />
              </div>
              <SubmitButton className="btn btn-secondary" pendingText="Creating...">
                Create Pool
              </SubmitButton>
            </form>
          </section>
        </div>
      </details>
    </main>
  );
}
