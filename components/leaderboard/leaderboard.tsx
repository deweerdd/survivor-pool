// Server component — leaderboard display
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaderboardEntry } from "@/lib/types";

interface Props {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export function Leaderboard({ entries, currentUserId }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">
            No scores yet — results appear after each episode.
          </p>
        ) : (
          <ol className="space-y-2">
            {entries.map((entry, i) => (
              <li
                key={entry.user_id}
                className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                  entry.user_id === currentUserId
                    ? "bg-emerald-50 font-medium"
                    : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-5 text-right">{i + 1}.</span>
                  <span className="truncate max-w-[120px]">
                    {entry.display_name ?? "Player"}
                    {entry.user_id === currentUserId && (
                      <span className="text-emerald-600 ml-1">(you)</span>
                    )}
                  </span>
                </div>
                <span className="font-mono font-semibold text-emerald-700">
                  {entry.total_points}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
