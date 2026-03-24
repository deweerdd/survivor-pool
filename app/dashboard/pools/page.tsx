import { requireUser } from "@/lib/auth-utils";
import { unwrap } from "@/lib/supabase/unwrap";
import { isMember, partitionPools, type PoolWithMembers } from "@/lib/pools";
import {
  joinPoolAction,
  joinByInviteCodeAction,
  createPrivatePoolAction,
} from "@/lib/actions/pools";
import Link from "next/link";

export default async function PoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!season) {
    return (
      <main className="px-4 py-6 sm:p-8 max-w-2xl mx-auto">
        <h1 className="mb-6">Pools</h1>
        <div className="card-flat py-10 text-center">
          <p className="text-muted-foreground">No active season at this time.</p>
        </div>
      </main>
    );
  }

  const [pools, memberCounts] = await Promise.all([
    supabase
      .from("pools")
      .select("*, pool_members(user_id)")
      .eq("season_id", season.id)
      .then(unwrap),
    (supabase.rpc as any)("get_pool_member_counts", {
      p_season_id: season.id,
    }).then(unwrap),
  ]);

  const countMap = new Map<number, number>(
    (memberCounts as { pool_id: number; member_count: number }[]).map((r) => [
      r.pool_id,
      r.member_count,
    ])
  );

  const { publicPools, myPrivatePools } = partitionPools(pools as PoolWithMembers[], user.id);

  return (
    <main className="px-4 py-6 sm:p-8 max-w-2xl mx-auto space-y-8">
      <h1>Pools — {season.name}</h1>

      <section>
        <h2 className="mb-4">Public Pool</h2>
        {publicPools.length === 0 ? (
          <div className="card-flat py-8 text-center">
            <p className="text-muted-foreground">No public pool for this season.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {publicPools.map((pool) => (
              <li
                key={pool.id}
                className="card-torch card-hover flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-lg">{pool.name}</span>
                  <span className="badge badge-secondary">
                    {countMap.get(pool.id) ?? 0} members
                  </span>
                </div>
                {!isMember(pool, user.id) && (
                  <form action={joinPoolAction.bind(null, pool.id)}>
                    <button type="submit" className="btn btn-torch">
                      Join Pool
                    </button>
                  </form>
                )}
                {isMember(pool, user.id) && (
                  <Link href={`/dashboard/pools/${pool.id}`} className="btn btn-ghost btn-sm">
                    Leaderboard
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {myPrivatePools.length > 0 && (
        <section>
          <h2 className="mb-4">My Private Pools</h2>
          <ul className="space-y-3">
            {myPrivatePools.map((pool) => (
              <li
                key={pool.id}
                className="card card-hover flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium">{pool.name}</span>
                  <span className="badge badge-secondary">
                    {countMap.get(pool.id) ?? 0} members
                  </span>
                  {pool.invite_code && (
                    <span className="badge badge-accent">Code: {pool.invite_code}</span>
                  )}
                </div>
                <Link href={`/dashboard/pools/${pool.id}`} className="btn btn-ghost btn-sm">
                  Leaderboard
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card-torch">
        <h2 className="mb-1">Join a Private Pool</h2>
        <hr className="divider-accent my-4" />
        <form action={joinByInviteCodeAction} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="inviteCode"
            required
            placeholder="Invite code"
            className="input flex-1 uppercase"
          />
          <button type="submit" className="btn btn-primary">
            Join
          </button>
        </form>
        {error === "invalid_code" && (
          <div className="callout callout-danger mt-3">Invalid invite code. Please try again.</div>
        )}
        {error === "no_season" && (
          <div className="callout callout-danger mt-3">
            No active season. Cannot create a pool right now.
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-1">Create a Private Pool</h2>
        <hr className="divider my-3" />
        <form action={createPrivatePoolAction} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="name"
            required
            placeholder="Pool name"
            className="input flex-1"
          />
          <button type="submit" className="btn btn-secondary">
            Create Pool
          </button>
        </form>
      </section>
    </main>
  );
}
