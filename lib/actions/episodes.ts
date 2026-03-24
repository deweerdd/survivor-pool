"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { requireActiveSeason } from "@/lib/season-utils";
import { revalidatePath } from "next/cache";

export async function lockEpisode(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get("episode_id") as string, 10);
  if (!id) throw new Error("Episode ID is required");
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("episodes").update({ is_locked: true }).eq("id", id);
  if (error) throw new Error(`Failed to lock episode: ${error.message}`);
  revalidatePath("/admin/episodes");
}

export async function createEpisode(formData: FormData) {
  await requireAdmin();
  const episode_number = parseInt(formData.get("episode_number") as string, 10);
  const title = (formData.get("title") as string)?.trim() || null;
  const air_date = (formData.get("air_date") as string)?.trim() || null;

  if (!episode_number) throw new Error("Episode number is required");

  const supabase = await createClient();
  const activeSeason = await requireActiveSeason(supabase, "/admin/episodes?error=no_season");

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("episodes").insert({
    season_id: activeSeason.id,
    episode_number,
    title,
    air_date,
    is_locked: false,
  });
  if (error) throw new Error(`Failed to create episode: ${error.message}`);
  revalidatePath("/admin/episodes");
}

export async function recordElimination(formData: FormData) {
  await requireAdmin();
  const episode_id = parseInt(formData.get("episode_id") as string, 10);
  const contestant_id = parseInt(formData.get("contestant_id") as string, 10);
  if (!episode_id || !contestant_id) throw new Error("Episode ID and contestant ID are required");

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
