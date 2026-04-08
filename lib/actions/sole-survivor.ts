"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/types";
import { getNextOpenEpisode } from "@/lib/episode-utils";

export async function makeSoleSurvivorPickAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Not authenticated." };

  const poolId = Number(formData.get("poolId"));
  const contestantId = Number(formData.get("contestantId"));

  if (!poolId || !contestantId) {
    return { status: "error", error: "Missing pool or contestant." };
  }

  // Verify membership
  const { data: memberCheck } = await supabase
    .from("pool_members")
    .select("user_id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!memberCheck) return { status: "error", error: "You are not a member of this pool." };

  // Get pool's season
  const { data: pool } = await supabase.from("pools").select("season_id").eq("id", poolId).single();
  if (!pool) return { status: "error", error: "Pool not found." };

  // Verify contestant is active in this season
  const { data: contestant } = await supabase
    .from("contestants")
    .select("id, is_active")
    .eq("id", contestantId)
    .eq("season_id", pool.season_id)
    .single();
  if (!contestant) return { status: "error", error: "Contestant not found." };
  if (!contestant.is_active)
    return { status: "error", error: "That contestant has been eliminated." };

  // Determine picked_at_episode from next unlocked episode
  const nextEpisode = await getNextOpenEpisode(supabase, pool.season_id);
  if (!nextEpisode) {
    return { status: "error", error: "No open episodes — picks are locked for this season." };
  }

  // Upsert: one pick per user per pool
  const { error } = await supabase.from("sole_survivor_picks").upsert(
    {
      pool_id: poolId,
      user_id: user.id,
      contestant_id: contestantId,
      picked_at_episode: nextEpisode.episode_number,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pool_id,user_id" }
  );

  if (error) return { status: "error", error: error.message };

  revalidatePath(`/dashboard/pools/${poolId}`);
  return { status: "ok" };
}
