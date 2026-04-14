"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/types";
import { getNextOpenEpisode } from "@/lib/episode-utils";
import { emitEventForPrivatePoolsInSeason } from "@/lib/pool-events";

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
    .select("id, name, is_active")
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
  return { status: "ok" };
}
