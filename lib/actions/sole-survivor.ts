"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/lib/auth-utils";
import { MAX_INT, requireInt } from "@/lib/validation";
import { type ActionResult, withAction } from "@/lib/actions/types";
import { getNextOpenEpisode } from "@/lib/episode-utils";
import { emitEventForPrivatePoolsInSeason } from "@/lib/pool-events";

export async function makeSoleSurvivorPickAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return withAction(async () => {
    const { supabase, user } = await requireUserForAction();

    const poolId = requireInt(formData.get("poolId"), "Pool", { min: 1, max: MAX_INT });
    const contestantId = requireInt(formData.get("contestantId"), "Contestant", {
      min: 1,
      max: MAX_INT,
    });

    const { data: memberCheck } = await supabase
      .from("pool_members")
      .select("user_id")
      .eq("pool_id", poolId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!memberCheck) throw new Error("You are not a member of this pool.");

    const { data: pool } = await supabase
      .from("pools")
      .select("season_id")
      .eq("id", poolId)
      .single();
    if (!pool) throw new Error("Pool not found.");

    const { data: contestant } = await supabase
      .from("contestants")
      .select("id, name, is_active")
      .eq("id", contestantId)
      .eq("season_id", pool.season_id)
      .single();
    if (!contestant) throw new Error("Contestant not found.");
    if (!contestant.is_active) throw new Error("That contestant has been eliminated.");

    const nextEpisode = await getNextOpenEpisode(supabase, pool.season_id);
    if (!nextEpisode) throw new Error("No open episodes — picks are locked for this season.");

    // Look up the previous pick (if any) to detect actual changes and build
    // a descriptive pool_events payload.
    const { data: previousPick } = await supabase
      .from("sole_survivor_picks")
      .select("contestant_id, contestants(name)")
      .eq("pool_id", poolId)
      .eq("user_id", user.id)
      .maybeSingle();

    const previousContestantId = previousPick?.contestant_id ?? null;
    const previousContestantName =
      (previousPick?.contestants as { name: string } | null)?.name ?? null;

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
    if (error) throw new Error(error.message);

    // Emit pick_changed event to every private pool the user is in for this
    // season, but only if the contestant actually changed (or is brand new).
    if (previousContestantId !== contestantId) {
      await emitEventForPrivatePoolsInSeason(createAdminClient(), {
        userId: user.id,
        seasonId: pool.season_id,
        type: "pick_changed",
        payload: {
          contestant_name: contestant.name,
          previous_contestant_name: previousContestantName,
          episode_number: nextEpisode.episode_number,
        },
      });
    }

    revalidatePath(`/dashboard/pools/${poolId}`);
  });
}
