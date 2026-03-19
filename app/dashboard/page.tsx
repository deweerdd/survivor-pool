// Server component
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .single();

  if (!season) {
    return (
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">No active season right now.</p>
      </main>
    );
  }

  const [{ data: memberships }, { data: openEpisode }] = await Promise.all([
    supabase.from("pool_members").select("pool_id, pools(id, name)").eq("user_id", user.id),
    supabase
      .from("episodes")
      .select("id, episode_number")
      .eq("season_id", season.id)
      .eq("is_locked", false)
      .order("episode_number", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const poolsWithScores = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const pool = m.pools as { id: number; name: string } | null;
      if (!pool) return null;

      const { data: scores } = await supabase.rpc("get_pool_scores", {
        p_pool_id: m.pool_id,
      });

      // compute rank from sorted scores
      const sorted = [...(scores ?? [])].sort((a, b) => b.total_points - a.total_points);
      let rank: number | null = null;
      let currentRank = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i].total_points !== sorted[i - 1].total_points) {
          currentRank = i + 1;
        }
        if (sorted[i].user_id === user.id) {
          rank = currentRank;
          break;
        }
      }

      const me = (scores ?? []).find((s) => s.user_id === user.id);

      return {
        poolId: pool.id,
        poolName: pool.name,
        rank,
        totalPoints: me?.total_points ?? 0,
      };
    })
  );

  const pools = poolsWithScores.filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Active Season: {season.name}</h1>

      {openEpisode && pools.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 space-y-2">
          <p className="font-semibold text-yellow-800">
            Episode {openEpisode.episode_number} is open!
          </p>
          <p className="text-sm text-yellow-700">Allocate your points before lock.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {pools.map((p) => (
              <Link
                key={p.poolId}
                href={`/dashboard/pools/${p.poolId}/allocate`}
                className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded text-sm font-medium"
              >
                {p.poolName}
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My Pools</h2>

        {pools.length === 0 ? (
          <p className="text-gray-500">
            You haven&apos;t joined any pools yet.{" "}
            <Link href="/dashboard/pools" className="text-blue-600 hover:underline">
              Browse pools
            </Link>
          </p>
        ) : (
          <div className="divide-y border rounded-lg">
            {pools.map((p) => (
              <div key={p.poolId} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{p.poolName}</span>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{p.rank !== null ? `#${p.rank}` : "—"}</span>
                  <span>{p.totalPoints} pts</span>
                  <Link
                    href={`/dashboard/pools/${p.poolId}`}
                    className="text-blue-600 hover:underline"
                  >
                    Leaderboard
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Link href="/dashboard/pools" className="inline-block text-sm text-blue-600 hover:underline">
        Browse all pools →
      </Link>
    </main>
  );
}
