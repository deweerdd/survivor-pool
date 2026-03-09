import { createClient } from "@/lib/supabase/server";
import type { Pool, PoolMemberWithProfile, PoolWithSeason } from "@/lib/types";

export async function getPoolById(poolId: string): Promise<PoolWithSeason | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pools")
    .select("*, seasons(*)")
    .eq("id", poolId)
    .single();

  if (error) return null;
  return data as unknown as PoolWithSeason;
}

export async function getPoolsByUser(userId: string): Promise<PoolWithSeason[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pool_members")
    .select("pool_id, pools(*, seasons(*))")
    .eq("user_id", userId);

  if (error || !data) return [];
  const rows = data as unknown as Array<{ pool_id: string; pools: PoolWithSeason }>;
  return rows.map((row) => row.pools);
}

export async function createPool(input: {
  name: string;
  season_id: string;
  commissioner_id: string;
}): Promise<Pool | null> {
  const supabase = await createClient();
  const invite_code = generateInviteCode();

  const { data, error } = await supabase
    .from("pools")
    .insert({ ...input, invite_code } as never)
    .select()
    .single();

  if (error) {
    console.error("createPool error:", error);
    return null;
  }

  const pool = data as unknown as Pool;

  // Auto-add commissioner as a member
  await supabase.from("pool_members").insert({
    pool_id: pool.id,
    user_id: input.commissioner_id,
  } as never);

  return pool;
}

export async function getPoolByInviteCode(code: string): Promise<Pool | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pools")
    .select()
    .eq("invite_code", code.toUpperCase())
    .single();

  if (error) return null;
  return data as unknown as Pool;
}

export async function joinPool(poolId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();

  // Check not already a member
  const { data: existing } = await supabase
    .from("pool_members")
    .select("id")
    .eq("pool_id", poolId)
    .eq("user_id", userId)
    .single();

  if (existing) return true;

  const { error } = await supabase.from("pool_members").insert({
    pool_id: poolId,
    user_id: userId,
  } as never);

  return !error;
}

export async function getPoolMembers(poolId: string): Promise<PoolMemberWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pool_members")
    .select("*, profiles(display_name, avatar_url)")
    .eq("pool_id", poolId);

  if (error || !data) return [];
  return data as unknown as PoolMemberWithProfile[];
}

export async function isPoolMember(poolId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pool_members")
    .select("id")
    .eq("pool_id", poolId)
    .eq("user_id", userId)
    .single();

  return !!data;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}
