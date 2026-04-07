import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEpisodePastLockTime } from "@/lib/lock-utils";

/**
 * Locks every unlocked episode whose air_date lock-time (7 pm ET) has passed.
 * Idempotent — safe to call on every page load.
 */
export async function autoLockEpisodes(): Promise<number> {
  const admin = createAdminClient();

  const { data: episodes } = await admin
    .from("episodes")
    .select("id, air_date")
    .eq("is_locked", false)
    .not("air_date", "is", null);

  if (!episodes || episodes.length === 0) return 0;

  const idsToLock = episodes.filter((ep) => isEpisodePastLockTime(ep.air_date)).map((ep) => ep.id);

  if (idsToLock.length === 0) return 0;

  const { error } = await admin.from("episodes").update({ is_locked: true }).in("id", idsToLock);

  if (error) throw new Error(`Auto-lock failed: ${error.message}`);
  return idsToLock.length;
}
