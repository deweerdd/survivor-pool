import { requireUser } from "@/lib/auth-utils";
import { notFound, redirect } from "next/navigation";
import AllocationForm from "@/components/AllocationForm";
import { submitAllocation } from "@/lib/actions/allocations";

export default async function AllocatePage({ params }: { params: Promise<{ poolId: string }> }) {
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
  if (!memberCheckResult.data) redirect("/dashboard/pools");

  const seasonId = poolResult.data.season_id;

  const [episodeResult, contestantsResult] = await Promise.all([
    supabase
      .from("episodes")
      .select("id, episode_number, is_locked")
      .eq("season_id", seasonId)
      .eq("is_locked", false)
      .order("episode_number")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("contestants")
      .select("id, name, tribe, img_url")
      .eq("season_id", seasonId)
      .eq("is_active", true)
      .order("name"),
  ]);

  const episode = episodeResult.data;

  // Fetch existing allocation if there's an active episode
  let existingAllocation: Record<number, number> = {};
  if (episode) {
    const { data: allocRows } = await supabase
      .from("allocations")
      .select("contestant_id, points")
      .eq("pool_id", numericPoolId)
      .eq("episode_id", episode.id)
      .eq("user_id", user.id);

    if (allocRows) {
      for (const row of allocRows) {
        existingAllocation[row.contestant_id] = row.points;
      }
    }
  }

  // Group contestants by tribe
  const tribeMap = new Map<string, { id: number; name: string; img_url: string | null }[]>();
  for (const c of contestantsResult.data ?? []) {
    const tribe = c.tribe ?? "Unknown";
    if (!tribeMap.has(tribe)) tribeMap.set(tribe, []);
    tribeMap.get(tribe)!.push({ id: c.id, name: c.name, img_url: c.img_url });
  }
  const contestantsByTribe = Array.from(tribeMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tribe, members]) => ({ tribe, members }));

  return (
    <main className="px-4 py-6 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <a href={`/dashboard/pools/${numericPoolId}`} className="btn btn-ghost btn-sm">
          ← Back to leaderboard
        </a>
        <h1 className="mt-2">{poolResult.data.name}</h1>
      </div>

      {!episode ? (
        <div className="callout callout-info py-6 text-center">
          No active episode to allocate points for right now.
        </div>
      ) : (
        <AllocationForm
          contestants={contestantsByTribe}
          existingAllocation={existingAllocation}
          episodeId={episode.id}
          poolId={numericPoolId}
          episodeNumber={episode.episode_number}
          isLocked={episode.is_locked}
          submitAction={submitAllocation}
        />
      )}
    </main>
  );
}
