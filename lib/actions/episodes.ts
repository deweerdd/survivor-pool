"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { requireActiveSeason } from "@/lib/season-utils";
import { MAX_INT, requireString, requireInt, optionalDate } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function lockEpisode(formData: FormData) {
  await requireAdmin();
  const id = requireInt(formData.get("episode_id"), "Episode ID", { min: 1, max: MAX_INT });
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("episodes").update({ is_locked: true }).eq("id", id);
  if (error) throw new Error(`Failed to lock episode: ${error.message}`);
  revalidatePath("/admin/episodes");
}

export async function createEpisode(formData: FormData) {
  await requireAdmin();
  const episode_number = requireInt(formData.get("episode_number"), "Episode number", {
    min: 1,
    max: 100,
  });
  const title = requireString(formData.get("title"), "Title", {
    min: 1,
    max: 200,
    required: false,
  });
  const air_date = optionalDate(formData.get("air_date"), "Air date");
  const is_finale = formData.get("is_finale") === "true";

  const supabase = await createClient();
  const activeSeason = await requireActiveSeason(supabase, "/admin/episodes?error=no_season");

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("episodes").insert({
    season_id: activeSeason.id,
    episode_number,
    title,
    air_date,
    is_locked: false,
    is_finale,
  });
  if (error) throw new Error(`Failed to create episode: ${error.message}`);
  revalidatePath("/admin/episodes");
}

export async function recordElimination(formData: FormData) {
  await requireAdmin();
  const episode_id = requireInt(formData.get("episode_id"), "Episode ID", {
    min: 1,
    max: MAX_INT,
  });
  const contestant_id = requireInt(formData.get("contestant_id"), "Contestant ID", {
    min: 1,
    max: MAX_INT,
  });

  const adminClient = createAdminClient();
  const { error: elimErr } = await adminClient
    .from("eliminations")
    .insert({ episode_id, contestant_id });
  if (elimErr) throw new Error(`Failed to record elimination: ${elimErr.message}`);
  const { error: updateErr } = await adminClient
    .from("contestants")
    .update({ is_active: false })
    .eq("id", contestant_id);
  if (updateErr) throw new Error(`Failed to update contestant status: ${updateErr.message}`);
  revalidatePath("/admin/episodes");
}
