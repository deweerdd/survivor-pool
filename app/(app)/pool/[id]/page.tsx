// Server component — pool overview with leaderboard and episode list
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPoolById, isPoolMember, getPoolMembers } from "@/lib/db/pools";
import { getEpisodesBySeasonId, getSurvivorsBySeason } from "@/lib/db/episodes";
import { getPicksForEpisode } from "@/lib/db/picks";
import { calculateEpisodeScore, calculateLeaderboard } from "@/lib/scoring";
import { Leaderboard } from "@/components/leaderboard/leaderboard";
import { EpisodeList } from "@/components/picks/episode-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function PoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pool = await getPoolById(id);
  if (!pool) notFound();

  const isMember = await isPoolMember(pool.id, user.id);
  if (!isMember) redirect("/dashboard");

  const [episodes, members] = await Promise.all([
    getEpisodesBySeasonId(pool.season_id),
    getPoolMembers(pool.id),
  ]);

  // Build leaderboard from all scored episodes
  const now = new Date();
  const releasedEpisodes = episodes.filter(
    (e) => new Date(e.results_release_at) <= now
  );

  // Fetch picks for all released episodes and calculate scores
  const allScores = (
    await Promise.all(
      releasedEpisodes.map(async (episode) => {
        const picks = await getPicksForEpisode(pool.id, episode.id);
        const survivors = await getSurvivorsBySeason(pool.season_id);
        const eliminatedIds = survivors
          .filter((s) => s.eliminated_episode_id === episode.id)
          .map((s) => s.id);
        return calculateEpisodeScore(picks, eliminatedIds);
      })
    )
  ).flat();

  const leaderboardData = calculateLeaderboard(allScores);

  // Enrich leaderboard with display names from pool members
  const memberMap = Object.fromEntries(
    members.map((m) => [m.user_id, m.profiles])
  );

  const enrichedLeaderboard = leaderboardData.map((entry) => ({
    ...entry,
    display_name: memberMap[entry.user_id]?.display_name ?? "Player",
    avatar_url: memberMap[entry.user_id]?.avatar_url ?? null,
  }));

  const isCommissioner = pool.commissioner_id === user.id;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{pool.name}</h1>
            {isCommissioner && (
              <Badge variant="secondary">Commissioner</Badge>
            )}
          </div>
          <p className="text-gray-500 mt-1">{pool.seasons?.name}</p>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Invite code: <span className="font-medium">{pool.invite_code}</span>
          </p>
        </div>
        {isCommissioner && (
          <Link href={`/pool/${pool.id}/admin`}>
            <Button variant="outline" size="sm">Pool Settings</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Leaderboard entries={enrichedLeaderboard} currentUserId={user.id} />
        </div>
        <div className="lg:col-span-2">
          <EpisodeList
            episodes={episodes}
            poolId={pool.id}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  );
}
