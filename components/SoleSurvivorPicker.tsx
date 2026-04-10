"use client";

import { useState } from "react";
import { useActionState } from "react";
import ContestantAvatar from "@/components/ContestantAvatar";
import type { ActionResult } from "@/lib/actions/types";

type Contestant = {
  id: number;
  name: string;
  tribe: string | null;
  img_url: string | null;
};

type Props = {
  contestants: Contestant[];
  poolId: number;
  currentPick: { contestant_id: number; picked_at_episode: number } | null;
  projectedPoints: number | null;
  totalEpisodes: number;
  submitAction: (prevState: ActionResult | null, formData: FormData) => Promise<ActionResult>;
};

export default function SoleSurvivorPicker({
  contestants,
  poolId,
  currentPick,
  projectedPoints,
  totalEpisodes,
  submitAction,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isChanging, setIsChanging] = useState(!currentPick);
  const [result, formAction, isPending] = useActionState(submitAction, null);

  const currentContestant = currentPick
    ? contestants.find((c) => c.id === currentPick.contestant_id)
    : null;

  // Group by tribe
  const tribeMap = new Map<string, Contestant[]>();
  for (const c of contestants) {
    const tribe = c.tribe ?? "Unknown";
    if (!tribeMap.has(tribe)) tribeMap.set(tribe, []);
    tribeMap.get(tribe)!.push(c);
  }
  const tribeGroups = Array.from(tribeMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  if (!isChanging && currentPick && currentContestant) {
    return (
      <div className="card-torch">
        <h3 className="mb-3">Sole Survivor Pick</h3>
        <div className="flex items-center gap-4">
          <ContestantAvatar
            imgUrl={currentContestant.img_url}
            name={currentContestant.name}
            size={48}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg">{currentContestant.name}</p>
            <p className="text-label">
              Picked at episode {currentPick.picked_at_episode} of {totalEpisodes}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-label">Projected bonus</p>
            <p className="text-display text-2xl font-bold text-primary">
              {projectedPoints ?? 0}
              <span className="text-sm text-muted-foreground ml-1">pts</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsChanging(true)}
          className="btn btn-outline btn-sm mt-4"
        >
          Change Pick
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          Changing your pick will reset the episode count — you may earn fewer points.
        </p>
      </div>
    );
  }

  return (
    <div className="card-torch">
      <h3 className="mb-1">
        {currentPick ? "Change Sole Survivor Pick" : "Pick Your Sole Survivor"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Who do you think will win? Earlier picks earn more points (2 pts per remaining episode).
      </p>

      <form action={formAction}>
        <input type="hidden" name="poolId" value={poolId} />
        <input type="hidden" name="contestantId" value={selectedId ?? ""} />

        {tribeGroups.map(([tribe, members]) => (
          <div key={tribe} className="mb-4">
            <p className="text-label pb-2 border-b border-border mb-2">{tribe}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {members.map((c) => {
                const isSelected = selectedId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`card-flat p-3 flex flex-col items-center gap-2 text-center cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-surface-raised glow-ember"
                        : "hover:border-primary/40"
                    }`}
                  >
                    <ContestantAvatar imgUrl={c.img_url} name={c.name} size={40} />
                    <span className="text-sm font-medium leading-tight">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 mt-4">
          <button type="submit" disabled={!selectedId || isPending} className="btn btn-torch">
            {isPending ? "Saving…" : currentPick ? "Update Pick" : "Lock In Pick"}
          </button>
          {currentPick && (
            <button
              type="button"
              onClick={() => {
                setIsChanging(false);
                setSelectedId(null);
              }}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          )}
        </div>

        {result?.status === "ok" && (
          <div className="callout callout-success mt-3">Sole Survivor pick saved!</div>
        )}
        {result?.status === "error" && (
          <div className="callout callout-danger mt-3">{result.error}</div>
        )}
      </form>
    </div>
  );
}
