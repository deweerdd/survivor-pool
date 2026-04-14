"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/types";
import { autoLockEpisodes } from "@/lib/actions/auto-lock";

export async function submitAllocation(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Not authenticated." };

  const epId = Number(formData.get("episodeId"));
  const poolId = Number(formData.get("poolId"));

  // Verify membership
  const { data: memberCheck } = await supabase
    .from("pool_members")
    .select("user_id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!memberCheck) return { status: "error", error: "You are not a member of this pool." };

  // Auto-lock any past-deadline episodes before checking
  await autoLockEpisodes();

  // Verify episode is still unlocked
  const { data: ep } = await supabase.from("episodes").select("is_locked").eq("id", epId).single();
  if (!ep) return { status: "error", error: "Episode not found." };
  if (ep.is_locked) return { status: "error", error: "This episode is locked." };

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
  if (totalPoints !== 20) return { status: "error", error: "Total points must equal 20." };

  // Atomic replace via Postgres function — delete + insert run in a single
  // transaction, so a failed insert cannot leave the user empty-handed.
  const { error } = await supabase.rpc("replace_allocations", {
    p_pool_id: poolId,
    p_episode_id: epId,
    p_contestant_ids: entries.map((e) => e.contestant_id),
    p_points: entries.map((e) => e.points),
  });
  if (error) return { status: "error", error: error.message };

  revalidatePath(`/dashboard/pools/${poolId}/allocate`);
  return { status: "ok" };
}
