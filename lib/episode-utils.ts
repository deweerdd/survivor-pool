import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Fetches the first unlocked episode for a season (lowest episode_number).
 * Returns null if all episodes are locked or none exist.
 */
export async function getNextOpenEpisode(supabase: SupabaseClient<Database>, seasonId: number) {
  const { data } = await supabase
    .from("episodes")
    .select("id, episode_number")
    .eq("season_id", seasonId)
    .eq("is_locked", false)
    .order("episode_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}
