// Server component — list of episodes with pick/view actions
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Episode } from "@/lib/types";

interface Props {
  episodes: Episode[];
  poolId: string;
  currentUserId: string;
}

export function EpisodeList({ episodes, poolId, currentUserId }: Props) {
  const now = new Date();

  if (episodes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-400 text-sm">
          No episodes scheduled yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-800">Episodes</h2>
      {episodes.map((episode) => {
        const isLocked = new Date(episode.picks_lock_at) <= now;
        const resultsReleased = new Date(episode.results_release_at) <= now;
        const lockDate = new Date(episode.picks_lock_at);

        return (
          <Card key={episode.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-sm">Episode {episode.episode_number}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isLocked
                    ? resultsReleased
                      ? "Results released"
                      : "Picks locked — awaiting results"
                    : `Picks lock ${lockDate.toLocaleDateString()} at ${lockDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {resultsReleased && (
                  <Badge variant="secondary" className="text-xs">Scored</Badge>
                )}
                {isLocked && !resultsReleased && (
                  <Badge variant="outline" className="text-xs">Locked</Badge>
                )}
                {!isLocked && (
                  <Link href={`/pool/${poolId}/picks?episode=${episode.id}`}>
                    <Button size="sm">Submit Picks</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
