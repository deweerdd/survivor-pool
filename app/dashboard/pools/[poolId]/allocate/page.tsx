import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AllocationForm from "@/components/AllocationForm";
import { revalidatePath } from "next/cache";

export default async function AllocatePage({ params }: { params: Promise<{ poolId: string }> }) {
  const { poolId } = await params;
  const numericPoolId = Number(poolId);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [poolResult, memberCheckResult] = await Promise.all([
    supabase.from("pools").select("id, name, season_id").eq("id", numericPoolId).single(),
    supabase
      .from("pool_members")
      .select("user_id")
      .eq("pool_id", numericPoolId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!poolResult.data) redirect("/dashboard/pools");
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

  async function submitAllocation(
    _prevState: string | null,
    formData: FormData
  ): Promise<string | null> {
    "use server";
    const supabaseSrv = await createClient();
    const {
      data: { user: authUser },
    } = await supabaseSrv.auth.getUser();
    if (!authUser) return "Not authenticated.";

    const epId = Number(formData.get("episodeId"));
    const poolIdForm = Number(formData.get("poolId"));

    // Verify membership
    const { data: memberCheck } = await supabaseSrv
      .from("pool_members")
      .select("user_id")
      .eq("pool_id", poolIdForm)
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (!memberCheck) return "You are not a member of this pool.";

    // Verify episode is still unlocked
    const { data: ep } = await supabaseSrv
      .from("episodes")
      .select("is_locked")
      .eq("id", epId)
      .single();
    if (!ep) return "Episode not found.";
    if (ep.is_locked) return "This episode is locked.";

    // Collect points from form
    const entries: { contestant_id: number; points: number }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("points_")) {
        const contestantId = Number(key.slice(7));
        const pts = Number(value);
        if (pts > 0) {
          entries.push({ contestant_id: contestantId, points: pts });
        }
      }
    }

    const totalPoints = entries.reduce((s, e) => s + e.points, 0);
    if (totalPoints !== 20) return "Total points must equal 20.";

    // Delete existing and insert new
    await supabaseSrv
      .from("allocations")
      .delete()
      .eq("pool_id", poolIdForm)
      .eq("episode_id", epId)
      .eq("user_id", authUser.id);

    if (entries.length > 0) {
      const { error } = await supabaseSrv.from("allocations").insert(
        entries.map((e) => ({
          pool_id: poolIdForm,
          episode_id: epId,
          user_id: authUser.id,
          contestant_id: e.contestant_id,
          points: e.points,
        }))
      );
      if (error) return error.message;
    }

    revalidatePath(`/dashboard/pools/${poolIdForm}/allocate`);
    return "ok";
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <a
          href={`/dashboard/pools/${numericPoolId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to leaderboard
        </a>
        <h1 className="text-2xl font-bold mt-2">{poolResult.data.name}</h1>
      </div>

      {!episode ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
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
