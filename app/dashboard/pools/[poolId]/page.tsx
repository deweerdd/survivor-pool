import { requireUser } from "@/lib/auth-utils";
import { getNextOpenEpisode } from "@/lib/episode-utils";
import {
  buildLeaderboard,
  toMemberRows,
  type ScoreRow,
  type SoleSurvivorScoreRow,
} from "@/lib/leaderboard";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="rank-gold">1</span>;
  if (rank === 2) return <span className="rank-silver">2</span>;
  if (rank === 3) return <span className="rank-bronze">3</span>;
  return <span className="text-muted-foreground tabular-nums">{rank}</span>;
}

export default async function PoolLeaderboardPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params;
  const numericPoolId = Number(poolId);
  const { supabase, user } = await requireUser();

  const [poolResult, memberCheckResult, allMembersResult, scoresResult, ssScoresResult] =
    await Promise.all([
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
      supabase.rpc("get_sole_survivor_scores", { p_pool_id: numericPoolId }),
    ]);

  if (!poolResult.data) notFound();
  if (!memberCheckResult.data) redirect("/dashboard");

  const seasonId = poolResult.data.season_id;
  const hasUnlockedEpisode = !!(await getNextOpenEpisode(supabase, seasonId));

  // Check if user's sole survivor pick has been eliminated (for nudge)
  const { data: currentPick } = await supabase
    .from("sole_survivor_picks")
    .select("contestant_id")
    .eq("pool_id", numericPoolId)
    .eq("user_id", user.id)
    .maybeSingle();

  let pickIsEliminated = false;
  if (currentPick) {
    const { data: contestant } = await supabase
      .from("contestants")
      .select("is_active")
      .eq("id", currentPick.contestant_id)
      .single();
    pickIsEliminated = contestant ? !contestant.is_active : false;
  }

  const members = toMemberRows(
    (allMembersResult.data ?? []) as { user_id: string; profiles: unknown }[]
  );

  const soleSurvivorScores = (ssScoresResult.data ?? []) as SoleSurvivorScoreRow[];
  const leaderboard = buildLeaderboard(
    (scoresResult.data ?? []) as ScoreRow[],
    members,
    user.id,
    soleSurvivorScores
  );

  const hasSoleSurvivorScores = soleSurvivorScores.length > 0;

  const noEliminations = leaderboard.every((e) => e.totalPoints === 0);

  return (
    <main className="px-4 py-6 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <Link href="/dashboard" className="btn btn-ghost btn-sm mb-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Dashboard
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1>{poolResult.data.name}</h1>
          <div className="flex items-center gap-2">
            {hasUnlockedEpisode && (
              <>
                <Link href={`/dashboard/pools/${numericPoolId}/allocate`} className="btn btn-torch">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  Allocate
                </Link>
                <Link
                  href={`/dashboard/pools/${numericPoolId}/sole-survivor`}
                  className="btn btn-secondary"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Sole Survivor
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {pickIsEliminated && (
        <div className="callout callout-warning animate-fade-up">
          Your Sole Survivor pick has been eliminated!{" "}
          <Link
            href={`/dashboard/pools/${numericPoolId}/sole-survivor`}
            className="underline font-semibold"
          >
            Pick a new one
          </Link>{" "}
          to earn bonus points.
        </div>
      )}

      {noEliminations && (
        <div className="callout callout-warning animate-fade-up">
          No eliminations recorded yet — all members start at 0 points.
        </div>
      )}

      <div className="card p-0 overflow-hidden animate-fade-up delay-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="text-label pb-3 pr-4 pl-5 pt-4">
                Rank
              </th>
              <th scope="col" className="text-label pb-3 pr-4 pt-4">
                Player
              </th>
              {hasSoleSurvivorScores && (
                <th scope="col" className="text-label pb-3 pr-2 pt-4 text-right">
                  SS Bonus
                </th>
              )}
              <th scope="col" className="text-label pb-3 pr-5 pt-4 text-right">
                Points
              </th>
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
                  <RankBadge rank={entry.rank} />
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
                {hasSoleSurvivorScores && (
                  <td className="py-3 pr-2 text-right">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {entry.soleSurvivorPoints > 0 ? `+${entry.soleSurvivorPoints}` : "\u2014"}
                    </span>
                  </td>
                )}
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
