"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { revalidatePath } from "next/cache";

export async function createSeason(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const wiki_url = (formData.get("wiki_url") as string)?.trim() || null;

  if (!name) throw new Error("Season name is required");

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("seasons").insert({ name, wiki_url, is_active: false });
  if (error) throw new Error(`Failed to create season: ${error.message}`);
  revalidatePath("/admin/seasons");
}

export async function activateSeason(formData: FormData) {
  await requireAdmin();
  const seasonId = Number(formData.get("seasonId"));
  if (!seasonId) throw new Error("Season ID is required");

  const adminClient = createAdminClient();
  const { error: deactivateErr } = await adminClient
    .from("seasons")
    .update({ is_active: false })
    .neq("id", seasonId);
  if (deactivateErr) throw new Error(`Failed to deactivate seasons: ${deactivateErr.message}`);

  const { error: activateErr } = await adminClient
    .from("seasons")
    .update({ is_active: true })
    .eq("id", seasonId);
  if (activateErr) throw new Error(`Failed to activate season: ${activateErr.message}`);

  // Auto-create public pool if one doesn't exist yet
  const { data: season } = await adminClient
    .from("seasons")
    .select("name")
    .eq("id", seasonId)
    .single();

  const { data: existingPool } = await adminClient
    .from("pools")
    .select("id")
    .eq("season_id", seasonId)
    .eq("is_public", true)
    .maybeSingle();

  if (season && !existingPool) {
    const { error: poolErr } = await adminClient.from("pools").insert({
      season_id: seasonId,
      name: season.name,
      is_public: true,
      invite_code: null,
      created_by: null,
    });
    if (poolErr) throw new Error(`Failed to create public pool: ${poolErr.message}`);
  }

  revalidatePath("/admin/seasons");
}
