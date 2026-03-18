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
