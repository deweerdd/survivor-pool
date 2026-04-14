import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

/**
 * Count-within-window rate limiter backed by the `rate_limit_attempts` table.
 * Every attempt (success or fail) is logged; if the user is over `max` within
 * the last `windowSec`, it returns { allowed: false } without logging a new row.
 *
 * Must be called with the admin (service-role) client — the table has RLS
 * enabled with no policies so the anon client cannot read or write.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  userId: string,
  action: string,
  opts: { max: number; windowSec: number }
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - opts.windowSec * 1000).toISOString();

  const { count, error: countErr } = await admin
    .from("rate_limit_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("attempted_at", since);

  if (countErr) throw new Error(`Rate limit check failed: ${countErr.message}`);

  if ((count ?? 0) >= opts.max) {
    return { allowed: false, retryAfterSec: opts.windowSec };
  }

  const { error: insertErr } = await admin
    .from("rate_limit_attempts")
    .insert({ user_id: userId, action });

  if (insertErr) throw new Error(`Rate limit log failed: ${insertErr.message}`);

  return { allowed: true };
}
