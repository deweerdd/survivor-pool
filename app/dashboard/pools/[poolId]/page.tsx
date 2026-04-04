import { requireUser } from "@/lib/auth-utils";
import { getNextOpenEpisode } from "@/lib/episode-utils";
import { buildLeaderboard, toMemberRows, type ScoreRow } from "@/lib/leaderboard";
import { notFound, redirect } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";

export default async function PoolLeaderboardPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params;
  const numericPoolId = Number(poolId);
  const { supabase, user } = await requireUser();

  const [poolResult, memberCheckResult, allMembersResult, scoresResult] = await Promise.all([
    supabase.from("pools").select("id, name, season_id").eq("id", numericPoolId).single(),
    supabase
      .from("pool_members")
      .select("user_id")
      .eq("pool_id", numericPoolId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("pool_members")
      .select("user_id, profiles(display_name, team_name, full_name, avatar_url)")
      .eq("pool_id", numericPoolId),
    supabase.rpc("get_pool_scores", { p_pool_id: numericPoolId }),
  ]);

  if (!poolResult.data) notFound();
  if (!memberCheckResult.data) redirect("/dashboard");

  const hasUnlockedEpisode = !!(await getNextOpenEpisode(supabase, poolResult.data.season_id));

  const members = toMemberRows(
    (allMembersResult.data ?? []) as { user_id: string; profiles: unknown }[]
  );

  const leaderboard = buildLeaderboard((scoresResult.data ?? []) as ScoreRow[], members, user.id);

  const noEliminations = leaderboard.every((e) => e.totalPoints === 0);

  return (
    <main className="px-4 py-6 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1>{poolResult.data.name} — Leaderboard</h1>
        {hasUnlockedEpisode && (
          <a href={`/dashboard/pools/${numericPoolId}/allocate`} className="btn btn-torch">
            Allocate Points
          </a>
        )}
      </div>

      {noEliminations && (
        <div className="callout callout-warning">
          No eliminations recorded yet — all members start at 0 points.
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="text-label pb-3 pr-4 pl-5 pt-4">Rank</th>
              <th className="text-label pb-3 pr-4 pt-4">Player</th>
              <th className="text-label pb-3 pr-5 pt-4 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr
                key={entry.userId}
                className={
                  entry.isCurrentUser
                    ? "border-b border-border bg-surface-raised font-semibold border-l-[3px] border-l-primary"
                    : "border-b border-border hover:bg-surface-raised transition-colors"
                }
              >
                <td className="py-3 pr-4 pl-5">
                  {entry.rank === 1 ? (
                    <span className="badge badge-accent">1</span>
                  ) : entry.rank === 2 ? (
                    <span
                      className="badge"
                      style={{
                        background: "var(--muted)",
                        color: "var(--foreground)",
                      }}
                    >
                      2
                    </span>
                  ) : entry.rank === 3 ? (
                    <span className="badge badge-primary">3</span>
                  ) : (
                    <span className="text-muted-foreground">{entry.rank}</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      avatarUrl={entry.avatarUrl}
                      fullName={entry.displayName}
                      size="md"
                    />
                    <span>
                      {entry.displayName}
                      {entry.isCurrentUser && <span className="badge badge-primary ml-2">you</span>}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-5 text-right">
                  <span className="text-display text-lg font-bold tabular-nums">
                    {entry.totalPoints}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
