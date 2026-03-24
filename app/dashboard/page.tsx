// Server component — auth gate handled by app/dashboard/layout.tsx
import { requireUser } from "@/lib/auth-utils";
import { getActiveSeason } from "@/lib/season-utils";
import { getNextOpenEpisode } from "@/lib/episode-utils";
import { getUserRank, type ScoreRow } from "@/lib/leaderboard";
import { unwrap } from "@/lib/supabase/unwrap";
import Link from "next/link";

export default async function DashboardPage() {
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

  const [memberships, openEpisode] = await Promise.all([
    supabase
      .from("pool_members")
      .select("pool_id, pools(id, name)")
      .eq("user_id", user.id)
      .then(unwrap),
    getNextOpenEpisode(supabase, season.id),
  ]);

  const poolsWithScores = await Promise.all(
    memberships.map(async (m) => {
      const pool = m.pools as { id: number; name: string } | null;
      if (!pool) return null;

      const { data: scores } = await supabase.rpc("get_pool_scores", {
        p_pool_id: m.pool_id,
      });

      const { rank, totalPoints } = getUserRank((scores ?? []) as ScoreRow[], user.id);

      return {
        poolId: pool.id,
        poolName: pool.name,
        rank,
        totalPoints,
      };
    })
  );

  const pools = poolsWithScores.filter((p): p is NonNullable<typeof p> => p !== null);
  const totalPoints = pools.reduce((sum, p) => sum + p.totalPoints, 0);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 space-y-6">
      {/* ── Season Header ── */}
      <div className="card-torch">
        <p className="text-label">Active Season</p>
        <h1 className="mt-1">{season.name}</h1>
        <hr className="divider-accent my-4" />
        <div className="flex gap-8">
          <div>
            <p className="text-label">My Pools</p>
            <p className="text-stat">{pools.length}</p>
          </div>
          <div>
            <p className="text-label">Total Points</p>
            <p className="text-stat">{totalPoints}</p>
          </div>
        </div>
      </div>

      {/* ── Allocate CTA ── */}
      {openEpisode && pools.length > 0 && (
        <div className="card-torch space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl">Episode {openEpisode.episode_number}</h2>
              <p className="text-sm text-muted-foreground">
                Open for allocation — lock your points in now.
              </p>
            </div>
            <span className="badge badge-accent shrink-0">Action Needed</span>
          </div>
          <hr className="divider" />
          <div className="flex flex-wrap gap-2">
            {pools.map((p) => (
              <Link
                key={p.poolId}
                href={`/dashboard/pools/${p.poolId}/allocate`}
                className="btn btn-torch"
              >
                Allocate — {p.poolName}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── My Pools ── */}
      <section className="space-y-4">
        <h2>My Pools</h2>

        {pools.length === 0 ? (
          <div className="card-flat py-10 text-center">
            <p className="text-muted-foreground mb-3">You haven&apos;t joined any pools yet.</p>
            <Link href="/dashboard/pools" className="btn btn-primary">
              Browse Pools
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pools.map((p) => (
              <div key={p.poolId} className="card card-hover">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg">{p.poolName}</h3>
                  <Link href={`/dashboard/pools/${p.poolId}`} className="btn btn-ghost btn-sm">
                    Leaderboard
                  </Link>
                </div>
                <hr className="divider mb-3" />
                <div className="flex gap-8">
                  <div>
                    <p className="text-label">Rank</p>
                    <p className="text-display text-2xl font-bold">
                      {p.rank !== null ? `#${p.rank}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-label">Points</p>
                    <p className="text-display text-2xl font-bold">{p.totalPoints}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Browse link ── */}
      <div className="text-center">
        <Link href="/dashboard/pools" className="btn btn-outline">
          Browse All Pools
        </Link>
      </div>
    </main>
  );
}
