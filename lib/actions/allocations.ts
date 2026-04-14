"use server";

import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/lib/auth-utils";
import { MAX_INT, requireInt } from "@/lib/validation";
import { type ActionResult, withAction } from "@/lib/actions/types";
import { autoLockEpisodes } from "@/lib/actions/auto-lock";

export async function submitAllocation(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return withAction(async () => {
    const { supabase, user } = await requireUserForAction();

    const poolId = requireInt(formData.get("poolId"), "Pool", { min: 1, max: MAX_INT });
    const epId = requireInt(formData.get("episodeId"), "Episode", { min: 1, max: MAX_INT });

    const { data: memberCheck } = await supabase
      .from("pool_members")
      .select("user_id")
      .eq("pool_id", poolId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!memberCheck) throw new Error("You are not a member of this pool.");

    await autoLockEpisodes();

    const { data: ep } = await supabase
      .from("episodes")
      .select("is_locked")
      .eq("id", epId)
      .single();
    if (!ep) throw new Error("Episode not found.");
    if (ep.is_locked) throw new Error("This episode is locked.");

    const entries: { contestant_id: number; points: number }[] = [];
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("points_")) continue;
      const contestantId = requireInt(key.slice(7), "Contestant", { min: 1, max: MAX_INT });
      const pts = requireInt(value, "Points", { min: 0, max: 20 });
      if (pts > 0) entries.push({ contestant_id: contestantId, points: pts });
    }

    const totalPoints = entries.reduce((s, e) => s + e.points, 0);
    if (totalPoints !== 20) throw new Error("Total points must equal 20.");

    // Atomic replace via Postgres function — delete + insert run in a single
    // transaction, so a failed insert cannot leave the user empty-handed.
    const { error } = await supabase.rpc("replace_allocations", {
      p_pool_id: poolId,
      p_episode_id: epId,
      p_contestant_ids: entries.map((e) => e.contestant_id),
      p_points: entries.map((e) => e.points),
    });
    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/pools/${poolId}/allocate`);
  });
}
