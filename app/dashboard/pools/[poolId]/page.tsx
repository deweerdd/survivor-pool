import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildLeaderboard, type MemberRow, type ScoreRow } from "@/lib/leaderboard";
import { redirect } from "next/navigation";

export default async function PoolLeaderboardPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params;
  const numericPoolId = Number(poolId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [poolResult, memberCheckResult, allMembersResult, scoresResult] = await Promise.all([
    supabase.from("pools").select("id, name").eq("id", numericPoolId).single(),
    supabase
      .from("pool_members")
      .select("user_id")
      .eq("pool_id", numericPoolId)
      .eq("user_id", user.id)
      .maybeSingle(),
    // Admin client bypasses pool_members_read_own RLS so all members are visible
    createAdminClient()
      .from("pool_members")
      .select("user_id, profiles(display_name)")
      .eq("pool_id", numericPoolId),
    supabase.rpc("get_pool_scores", { p_pool_id: numericPoolId }),
  ]);

  if (!poolResult.data) redirect("/dashboard/pools");
  if (!memberCheckResult.data) redirect("/dashboard/pools");

  const members: MemberRow[] = (allMembersResult.data ?? []).map((row) => ({
    user_id: row.user_id,
    display_name: (row.profiles as { display_name: string | null } | null)?.display_name ?? null,
  }));

  const leaderboard = buildLeaderboard((scoresResult.data ?? []) as ScoreRow[], members, user.id);

  const noEliminations = leaderboard.every((e) => e.totalPoints === 0);

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{poolResult.data.name} — Leaderboard</h1>

      {noEliminations && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          No eliminations recorded yet — all members start at 0 points.
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 pr-4 font-medium">Rank</th>
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry) => (
            <tr
              key={entry.userId}
              className={
                entry.isCurrentUser
                  ? "border-b bg-blue-50 font-semibold"
                  : "border-b hover:bg-gray-50"
              }
            >
              <td className="py-3 pr-4 text-gray-600">{entry.rank}</td>
              <td className="py-3 pr-4">
                {entry.displayName}
                {entry.isCurrentUser && <span className="ml-2 text-xs text-blue-600">(you)</span>}
              </td>
              <td className="py-3 text-right tabular-nums">{entry.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
