import type { SupabaseClient } from "@supabase/supabase-js";

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
