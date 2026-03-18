import { createClient } from "@/lib/supabase/server";
import { isMember, partitionPools, type PoolWithMembers } from "@/lib/pools";
import { redirect } from "next/navigation";

export default async function PoolsPage() {
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

  const { data: pools } = await supabase
    .from("pools")
    .select("*, pool_members(user_id)")
    .eq("season_id", season.id);

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
                <span className="font-medium">{pool.name}</span>
                {!isMember(pool, user.id) && (
                  <form action={`/api/pools/${pool.id}/join`} method="POST">
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
        <section>
          <h2 className="text-xl font-semibold mb-4">My Private Pools</h2>
          <ul className="space-y-3">
            {myPrivatePools.map((pool) => (
              <li key={pool.id} className="flex items-center justify-between rounded-lg border p-4">
                <span className="font-medium">{pool.name}</span>
                <span className="text-sm text-green-600 font-medium">Joined</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
