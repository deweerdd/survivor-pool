// Server component — user's pools overview
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPoolsByUser } from "@/lib/db/pools";
import { getAllSeasons } from "@/lib/db/episodes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreatePoolButton } from "./create-pool-button";
import { JoinPoolButton } from "./join-pool-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [pools, seasons] = await Promise.all([
    getPoolsByUser(user.id),
    getAllSeasons(),
  ]);

  const activeSeasons = seasons.filter((s) => s.is_active);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Pools</h1>
          <p className="text-gray-500 mt-1">Manage your Survivor pools</p>
        </div>
        <div className="flex gap-2">
          <JoinPoolButton />
          {activeSeasons.length > 0 && (
            <CreatePoolButton seasons={activeSeasons} userId={user.id} />
          )}
        </div>
      </div>

      {pools.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500 mb-4">You haven&apos;t joined any pools yet.</p>
            <p className="text-sm text-gray-400">
              Create a new pool or join one with an invite code.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <Link key={pool.id} href={`/pool/${pool.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{pool.name}</CardTitle>
                    {pool.commissioner_id === user.id && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Commissioner
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {pool.seasons?.name ?? "Unknown Season"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-400">
                    Invite code: <span className="font-mono font-medium">{pool.invite_code}</span>
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
