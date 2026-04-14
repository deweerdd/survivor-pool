"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth-utils";
import { requireActiveSeason } from "@/lib/season-utils";
import { joinPool, getPoolByInviteCode, createPrivatePool } from "@/lib/pools";
import { emitPoolEvent } from "@/lib/pool-events";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Emits a member_joined event if the pool is private. No-op for public pools.
async function emitMemberJoinedIfPrivate(
  admin: SupabaseClient<Database>,
  poolId: number,
  userId: string
) {
  const { data: pool } = await admin.from("pools").select("is_public").eq("id", poolId).single();
  if (!pool || pool.is_public) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, team_name, full_name")
    .eq("id", userId)
    .single();

  const displayName =
    profile?.team_name || profile?.full_name || profile?.display_name || "A new member";

  await emitPoolEvent(admin, {
    poolId,
    type: "member_joined",
    actorUserId: userId,
    payload: { display_name: displayName },
  });
}

export async function joinPoolAction(poolId: number) {
  const { supabase, user } = await requireUser();
  const result = await joinPool(supabase, poolId, user.id);
  if (result.status === "joined") {
    await emitMemberJoinedIfPrivate(createAdminClient(), poolId, user.id);
  }
  revalidatePath("/dashboard");
}

export async function joinByInviteCodeAction(formData: FormData) {
  const { supabase, user } = await requireUser();

  const inviteCode = formData.get("inviteCode") as string;
  // Use admin client so the lookup works before the user is a member (RLS would block it otherwise)
  const admin = createAdminClient();
  const result = await getPoolByInviteCode(admin, inviteCode);
  if (result.status === "not_found") redirect("/dashboard?error=invalid_code");

  const joinResult = await joinPool(supabase, result.pool.id, user.id);
  if (joinResult.status === "joined") {
    await emitMemberJoinedIfPrivate(admin, result.pool.id, user.id);
  }
  redirect("/dashboard");
}

export async function createPrivatePoolAction(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = formData.get("name") as string;
  const season = await requireActiveSeason(supabase, "/dashboard?error=no_season");

  // Use admin client so the post-INSERT SELECT isn't blocked by the pools_read RLS policy
  // (user isn't a member yet at the moment of insert, so the anon client can't read back the row)
  const admin = createAdminClient();
  const result = await createPrivatePool(admin, name, season.id, user.id);
  if (result.status === "created") {
    const joinResult = await joinPool(supabase, result.pool.id, user.id);
    if (joinResult.status === "joined") {
      await emitMemberJoinedIfPrivate(admin, result.pool.id, user.id);
    }
  }
  revalidatePath("/dashboard");
}
