// Server component — commissioner pool settings page
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPoolById, getPoolMembers } from "@/lib/db/pools";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PoolAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pool = await getPoolById(id);
  if (!pool) notFound();

  // Only commissioner can access
  if (pool.commissioner_id !== user.id) redirect(`/pool/${id}`);

  const members = await getPoolMembers(pool.id);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pool Settings</h1>
        <p className="text-gray-500 mt-1">{pool.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Share this code with players to let them join your pool:
          </p>
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
            <span className="font-mono text-xl font-bold tracking-widest text-emerald-700">
              {pool.invite_code}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Players can enter this code on the dashboard to join.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-gray-100">
            {members.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {member.profiles?.display_name ?? "Player"}
                  </span>
                  {member.user_id === pool.commissioner_id && (
                    <Badge variant="secondary" className="text-xs">
                      Commissioner
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
