import { requireUser } from "@/lib/auth-utils";
import { getNextOpenEpisode } from "@/lib/episode-utils";
import { calculateSoleSurvivorPoints } from "@/lib/sole-survivor";
import { makeSoleSurvivorPickAction } from "@/lib/actions/sole-survivor";
import { notFound, redirect } from "next/navigation";
import SoleSurvivorPicker from "@/components/SoleSurvivorPicker";

export default async function SoleSurvivorPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params;
  const numericPoolId = Number(poolId);
  const { supabase, user } = await requireUser();

  const [poolResult, memberCheckResult] = await Promise.all([
    supabase.from("pools").select("id, name, season_id").eq("id", numericPoolId).single(),
    supabase
      .from("pool_members")
      .select("user_id")
      .eq("pool_id", numericPoolId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!poolResult.data) notFound();
  if (!memberCheckResult.data) redirect("/dashboard");

  const seasonId = poolResult.data.season_id;

  const [
    soleSurvivorPickResult,
    activeContestantsResult,
    totalEpisodesResult,
    eliminationsResult,
    nextEpisode,
  ] = await Promise.all([
    supabase
      .from("sole_survivor_picks")
      .select("contestant_id, picked_at_episode")
      .eq("pool_id", numericPoolId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("contestants")
      .select("id, name, tribe, img_url")
      .eq("season_id", seasonId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("episodes")
      .select("episode_number")
      .eq("season_id", seasonId)
      .order("episode_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("eliminations")
      .select("contestant_id, episodes!inner(season_id)")
      .eq("episodes.season_id", seasonId),
    getNextOpenEpisode(supabase, seasonId),
  ]);

  const currentPick = soleSurvivorPickResult.data ?? null;
  const activeContestants = activeContestantsResult.data ?? [];
  const totalEpisodes = totalEpisodesResult.data?.episode_number ?? 0;
  const eliminatedIds = (eliminationsResult.data ?? []).map(
    (e: { contestant_id: number }) => e.contestant_id
  );

  const projectedPoints = currentPick
    ? calculateSoleSurvivorPoints(currentPick.picked_at_episode, totalEpisodes)
    : null;

  const pickIsEliminated = currentPick ? eliminatedIds.includes(currentPick.contestant_id) : false;

  return (
    <main className="px-4 py-6 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <a href={`/dashboard/pools/${numericPoolId}`} className="btn btn-ghost btn-sm">
          ← Back to leaderboard
        </a>
        <h1 className="mt-2">{poolResult.data.name}</h1>
      </div>

      {pickIsEliminated && (
        <div className="callout callout-warning">
          Your Sole Survivor pick has been eliminated! Pick a new one below to earn bonus points.
        </div>
      )}

      {!nextEpisode ? (
        <div className="callout callout-info py-6 text-center">
          All episodes are locked — Sole Survivor picks are closed for this season.
        </div>
      ) : activeContestants.length === 0 ? (
        <div className="callout callout-info py-6 text-center">
          No active contestants remaining.
        </div>
      ) : (
        <SoleSurvivorPicker
          contestants={activeContestants}
          poolId={numericPoolId}
          currentPick={currentPick}
          projectedPoints={projectedPoints}
          totalEpisodes={totalEpisodes}
          submitAction={makeSoleSurvivorPickAction}
        />
      )}
    </main>
  );
}
