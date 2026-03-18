import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isMember,
  joinPool,
  getPoolByInviteCode,
  createPrivatePool,
  partitionPools,
  type PoolWithMembers,
} from "@/lib/pools";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function joinPoolAction(poolId: number) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await joinPool(supabase, poolId, user.id);
  revalidatePath("/dashboard/pools");
}

async function joinByInviteCodeAction(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const inviteCode = formData.get("inviteCode") as string;
  // Use admin client so the lookup works before the user is a member (RLS would block it otherwise)
  const result = await getPoolByInviteCode(createAdminClient(), inviteCode);
  if (result.status === "not_found") redirect("/dashboard/pools?error=invalid_code");

  await joinPool(supabase, result.pool.id, user.id);
  redirect("/dashboard/pools");
}

async function createPrivatePoolAction(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = formData.get("name") as string;
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .single();
  if (!season) return;

  // Use admin client so the post-INSERT SELECT isn't blocked by the pools_read RLS policy
  // (user isn't a member yet at the moment of insert, so the anon client can't read back the row)
  const result = await createPrivatePool(createAdminClient(), name, season.id, user.id);
  if (result.status === "created") {
    await joinPool(supabase, result.pool.id, user.id);
  }
  revalidatePath("/dashboard/pools");
}

export default async function PoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!season) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Pools</h1>
        <p className="text-gray-500">No active season at this time.</p>
      </main>
    );
  }

  const [{ data: pools }, { data: memberCounts }] = await Promise.all([
    supabase.from("pools").select("*, pool_members(user_id)").eq("season_id", season.id),
    (supabase.rpc as any)("get_pool_member_counts", { p_season_id: season.id }),
  ]);

  const countMap = new Map<number, number>(
    (memberCounts ?? []).map((r: { pool_id: number; member_count: number }) => [
      r.pool_id,
      r.member_count,
    ])
  );

  const { publicPools, myPrivatePools } = partitionPools(
    (pools ?? []) as PoolWithMembers[],
    user.id
  );

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Pools — {season.name}</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Public Pool</h2>
        {publicPools.length === 0 ? (
          <p className="text-gray-500">No public pool for this season.</p>
        ) : (
          <ul className="space-y-3">
            {publicPools.map((pool) => (
              <li key={pool.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <span className="font-medium">{pool.name}</span>
                  <span className="ml-3 text-xs text-gray-500">
                    {countMap.get(pool.id) ?? 0} members
                  </span>
                </div>
                {!isMember(pool, user.id) && (
                  <form action={joinPoolAction.bind(null, pool.id)}>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Join
                    </button>
                  </form>
                )}
                {isMember(pool, user.id) && (
                  <span className="text-sm text-green-600 font-medium">Joined</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {myPrivatePools.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">My Private Pools</h2>
          <ul className="space-y-3">
            {myPrivatePools.map((pool) => (
              <li key={pool.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <span className="font-medium">{pool.name}</span>
                  <span className="ml-3 text-xs text-gray-500">
                    {countMap.get(pool.id) ?? 0} members
                  </span>
                  {pool.invite_code && (
                    <span className="ml-3 text-xs text-gray-400">Code: {pool.invite_code}</span>
                  )}
                </div>
                <span className="text-sm text-green-600 font-medium">Joined</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Join a Private Pool</h2>
        <form action={joinByInviteCodeAction} className="flex gap-3">
          <input
            type="text"
            name="inviteCode"
            required
            placeholder="Invite code"
            className="flex-1 rounded-lg border px-4 py-2 text-sm uppercase"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Join
          </button>
        </form>
        {error === "invalid_code" && (
          <p className="mt-2 text-sm text-red-600">Invalid invite code. Please try again.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Create a Private Pool</h2>
        <form action={createPrivatePoolAction} className="flex gap-3">
          <input
            type="text"
            name="name"
            required
            placeholder="Pool name"
            className="flex-1 rounded-lg border px-4 py-2 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Create Pool
          </button>
        </form>
      </section>
    </main>
  );
}
