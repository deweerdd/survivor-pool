"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { requireActiveSeason } from "@/lib/season-utils";
import { revalidatePath } from "next/cache";

export async function createContestant(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const tribe = (formData.get("tribe") as string)?.trim() || null;
  const img_url = (formData.get("img_url") as string)?.trim() || null;

  if (!name) throw new Error("Contestant name is required");

  const supabase = await createClient();
  const activeSeason = await requireActiveSeason(supabase, "/admin/contestants?error=no_season");

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("contestants").insert({
    season_id: activeSeason.id,
    name,
    tribe,
    img_url,
    is_active: true,
  });
  if (error) throw new Error(`Failed to create contestant: ${error.message}`);
  revalidatePath("/admin/contestants");
}
