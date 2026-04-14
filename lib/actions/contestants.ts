"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { requireActiveSeason } from "@/lib/season-utils";
import { requireString, optionalUrl } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function createContestant(formData: FormData) {
  await requireAdmin();
  const name = requireString(formData.get("name"), "Contestant name", { min: 2, max: 100 })!;
  const tribe = requireString(formData.get("tribe"), "Tribe", {
    min: 1,
    max: 50,
    required: false,
  });
  const img_url = optionalUrl(formData.get("img_url"), "Image URL", 1000);

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
