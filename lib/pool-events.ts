import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { PoolEventType } from "@/lib/chat";

type AdminClient = SupabaseClient<Database>;

type EventPayload = { [key: string]: Json };

type EmitArgs = {
  poolId: number;
  type: PoolEventType;
  actorUserId: string | null;
  payload: EventPayload;
};

export async function emitPoolEvent(admin: AdminClient, args: EmitArgs): Promise<void> {
  await admin.from("pool_events").insert({
    pool_id: args.poolId,
    type: args.type,
    actor_user_id: args.actorUserId,
    payload: args.payload,
  });
}

type SeasonEmitArgs = {
  userId: string;
  seasonId: number;
  type: PoolEventType;
  payload: EventPayload;
};

// Emit one pool_events row per PRIVATE pool the user belongs to in the given season.
// Used for user-level actions (e.g. sole-survivor pick changes) that should fan out
// to every private pool that user is in.
export async function emitEventForPrivatePoolsInSeason(
  admin: AdminClient,
  args: SeasonEmitArgs
): Promise<void> {
  const { data: memberships } = await admin
    .from("pool_members")
    .select("pool_id, pools!inner(id, season_id, is_public)")
    .eq("user_id", args.userId);

  if (!memberships) return;

  const targetPoolIds = memberships
    .filter((m) => {
      const pool = m.pools as unknown as { season_id: number; is_public: boolean };
      return pool.season_id === args.seasonId && pool.is_public === false;
    })
    .map((m) => m.pool_id);

  if (targetPoolIds.length === 0) return;

  const rows = targetPoolIds.map((poolId) => ({
    pool_id: poolId,
    type: args.type,
    actor_user_id: args.userId,
    payload: args.payload,
  }));

  await admin.from("pool_events").insert(rows);
}
