import type { SupabaseClient } from "@supabase/supabase-js";

export function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export type CreatePrivatePoolResult =
  | { status: "created"; pool: { id: number; name: string; invite_code: string } }
  | { status: "error"; message: string };

export async function createPrivatePool(
  supabase: SupabaseClient,
  name: string,
  seasonId: number,
  userId: string
): Promise<CreatePrivatePoolResult> {
  const invite_code = generateInviteCode();
  const { data, error } = await supabase
    .from("pools")
    .insert({ name, season_id: seasonId, is_public: false, invite_code, created_by: userId })
    .select()
    .single();

  if (error) return { status: "error", message: error.message };
  return {
    status: "created",
    pool: { id: data.id, name: data.name, invite_code: data.invite_code },
  };
}

export type JoinPoolResult =
  | { status: "joined" }
  | { status: "already_member" }
  | { status: "error"; message: string };

export async function joinPool(
  supabase: SupabaseClient,
  poolId: number,
  userId: string
): Promise<JoinPoolResult> {
  const { error } = await supabase
    .from("pool_members")
    .insert({ pool_id: poolId, user_id: userId });

  if (!error) return { status: "joined" };
  if (error.code === "23505") return { status: "already_member" };
  return { status: "error", message: error.message };
}

export type GetPoolByInviteCodeResult =
  | { status: "found"; pool: { id: number; name: string; invite_code: string } }
  | { status: "not_found" };

export async function getPoolByInviteCode(
  supabase: SupabaseClient,
  inviteCode: string
): Promise<GetPoolByInviteCodeResult> {
  const { data, error } = await supabase
    .from("pools")
    .select("id, name, invite_code")
    .eq("invite_code", inviteCode.trim().toUpperCase())
    .single();
  if (error) return { status: "not_found" };
  return { status: "found", pool: data };
}

export type PoolWithMembers = {
  id: number;
  name: string;
  is_public: boolean;
  invite_code: string | null;
  created_by: string | null;
  season_id: number;
  created_at: string;
  pool_members: { user_id: string }[];
};

export function isMember(pool: PoolWithMembers, userId: string): boolean {
  return pool.pool_members.some((m) => m.user_id === userId);
}

export function partitionPools(
  pools: PoolWithMembers[],
  userId: string
): { publicPools: PoolWithMembers[]; myPrivatePools: PoolWithMembers[] } {
  const publicPools = pools.filter((p) => p.is_public);
  const myPrivatePools = pools.filter((p) => !p.is_public && isMember(p, userId));
  return { publicPools, myPrivatePools };
}
