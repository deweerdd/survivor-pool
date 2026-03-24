"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth-utils";
import { requireActiveSeason } from "@/lib/season-utils";
import { joinPool, getPoolByInviteCode, createPrivatePool } from "@/lib/pools";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function joinPoolAction(poolId: number) {
  const { supabase, user } = await requireUser();
  await joinPool(supabase, poolId, user.id);
  revalidatePath("/dashboard/pools");
}

export async function joinByInviteCodeAction(formData: FormData) {
  const { supabase, user } = await requireUser();

  const inviteCode = formData.get("inviteCode") as string;
  // Use admin client so the lookup works before the user is a member (RLS would block it otherwise)
  const result = await getPoolByInviteCode(createAdminClient(), inviteCode);
  if (result.status === "not_found") redirect("/dashboard/pools?error=invalid_code");

  await joinPool(supabase, result.pool.id, user.id);
  redirect("/dashboard/pools");
}

export async function createPrivatePoolAction(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = formData.get("name") as string;
  const season = await requireActiveSeason(supabase, "/dashboard/pools?error=no_season");

  // Use admin client so the post-INSERT SELECT isn't blocked by the pools_read RLS policy
  // (user isn't a member yet at the moment of insert, so the anon client can't read back the row)
  const result = await createPrivatePool(createAdminClient(), name, season.id, user.id);
  if (result.status === "created") {
    await joinPool(supabase, result.pool.id, user.id);
  }
  revalidatePath("/dashboard/pools");
}
