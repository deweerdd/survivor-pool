import { createClient } from "@/lib/supabase/server";
import type { Pick } from "@/lib/types";

export async function getPicksForEpisode(
  poolId: string,
  episodeId: string
): Promise<Pick[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("picks")
    .select()
    .eq("pool_id", poolId)
    .eq("episode_id", episodeId);

  if (error || !data) return [];
  return data as unknown as Pick[];
}

export async function getUserPicksForEpisode(
  poolId: string,
  episodeId: string,
  userId: string
): Promise<Pick[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("picks")
    .select()
    .eq("pool_id", poolId)
    .eq("episode_id", episodeId)
    .eq("user_id", userId);

  if (error || !data) return [];
  return data as unknown as Pick[];
}

export async function upsertPicks(
  picks: Array<{
    pool_id: string;
    user_id: string;
    episode_id: string;
    survivor_id: string;
    points: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  if (picks.length === 0) return { success: true };

  const supabase = await createClient();

  // Delete existing picks for this user/pool/episode, then insert fresh
  const { pool_id, user_id, episode_id } = picks[0];
  await supabase
    .from("picks")
    .delete()
    .eq("pool_id", pool_id)
    .eq("user_id", user_id)
    .eq("episode_id", episode_id);

  const { error } = await supabase.from("picks").insert(picks as never);

  if (error) {
    console.error("upsertPicks error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function clearUserPicks(
  poolId: string,
  userId: string,
  episodeId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("picks")
    .delete()
    .eq("pool_id", poolId)
    .eq("user_id", userId)
    .eq("episode_id", episodeId);

  return !error;
}
