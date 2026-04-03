import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { redirect } from "next/navigation";

/**
 * Fetches the single active season. Returns null if none exists.
 */
export async function getActiveSeason(supabase: SupabaseClient<Database>) {
  const { data } = await supabase.from("seasons").select("id, name").eq("is_active", true).single();

  return data;
}

/**
 * Fetches the active season or redirects with an error query param.
 * Use in server actions and pages that cannot proceed without an active season.
 */
export async function requireActiveSeason(
  supabase: SupabaseClient<Database>,
  redirectTo: string
): Promise<{ id: number; name: string }> {
  const season = await getActiveSeason(supabase);
  if (!season) redirect(redirectTo);
  return season;
}
