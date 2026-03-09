// Server component — weekly pick allocation page
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPoolById, isPoolMember } from "@/lib/db/pools";
import { getActiveSurvivors } from "@/lib/db/episodes";
import { getUserPicksForEpisode } from "@/lib/db/picks";
import { PickAllocator } from "@/components/picks/pick-allocator";
import type { Episode } from "@/lib/types";

export default async function PicksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string }>;
}) {
  const { id } = await params;
  const { episode: episodeId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pool = await getPoolById(id);
  if (!pool) notFound();

  const isMember = await isPoolMember(pool.id, user.id);
  if (!isMember) redirect("/dashboard");

  if (!episodeId) redirect(`/pool/${id}`);

  // Verify the episode exists and isn't locked
  const { data: episode } = await supabase
    .from("episodes")
    .select()
    .eq("id", episodeId)
    .single();

  if (!episode) notFound();

  const typedEpisode = episode as Episode;
  const now = new Date();
  if (new Date(typedEpisode.picks_lock_at) <= now) {
    redirect(`/pool/${id}`);
  }

  const [survivors, existingPicks] = await Promise.all([
    getActiveSurvivors(pool.season_id),
    getUserPicksForEpisode(pool.id, episodeId, user.id),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submit Picks</h1>
        <p className="text-gray-500 mt-1">
          {pool.name} · Episode {typedEpisode.episode_number}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Locks at{" "}
          {new Date(typedEpisode.picks_lock_at).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <PickAllocator
        survivors={survivors}
        poolId={pool.id}
        episodeId={episodeId}
        userId={user.id}
        existingPicks={existingPicks}
        poolPageHref={`/pool/${id}`}
      />
    </div>
  );
}
