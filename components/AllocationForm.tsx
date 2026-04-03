"use client";

import { useActionState } from "react";
import ContestantAvatar from "@/components/ContestantAvatar";
import type { ActionResult } from "@/lib/actions/types";

type Contestant = { id: number; name: string; img_url?: string | null };
type TribeGroup = { tribe: string; members: Contestant[] };

type Props = {
  contestants: TribeGroup[];
  existingAllocation: Record<number, number>;
  episodeId: number;
  poolId: number;
  episodeNumber: number;
  isLocked: boolean;
  submitAction: (prevState: ActionResult | null, formData: FormData) => Promise<ActionResult>;
};

import { useState } from "react";

export default function AllocationForm({
  contestants,
  existingAllocation,
  episodeId,
  poolId,
  episodeNumber,
  isLocked,
  submitAction,
}: Props) {
  const [points, setPoints] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    for (const group of contestants) {
      for (const c of group.members) {
        init[c.id] = existingAllocation[c.id] ?? 0;
      }
    }
    return init;
  });

  const [result, formAction, isPending] = useActionState(submitAction, null);

  const total = Object.values(points).reduce((s, v) => s + v, 0);
  const remaining = 20 - total;
  const isEditing = Object.keys(existingAllocation).length > 0;

  function adjust(id: number, delta: number) {
    setPoints((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + delta }));
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="episodeId" value={episodeId} />
      <input type="hidden" name="poolId" value={poolId} />
      {Object.entries(points).map(([id, val]) => (
        <input key={id} type="hidden" name={`points_${id}`} value={val} />
      ))}

      <div className="card-torch mb-6">
        <h2 className="mb-1">Episode {episodeNumber} — Allocate Your 20 Points</h2>
        <div className="flex items-center gap-6 mt-3">
          <div className="shrink-0">
            <p className="text-label">Remaining</p>
            <p
              className={`text-stat ${remaining === 0 ? "text-success" : remaining < 0 ? "text-destructive" : ""}`}
            >
              {remaining}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (total / 20) * 100)}%` }}
              />
            </div>
            <p className="text-label mt-1">{total} / 20 allocated</p>
          </div>
        </div>
      </div>
      <hr className="divider-accent mb-6" />

      {contestants.map((group) => (
        <div key={group.tribe} className="mb-6">
          <h3 className="text-label pb-2 border-b border-border mb-3">{group.tribe}</h3>
          <div className="space-y-2">
            {group.members.map((c) => {
              const val = points[c.id] ?? 0;
              return (
                <div
                  key={c.id}
                  className={`card-flat p-3 flex items-center justify-between${isLocked ? " opacity-75" : ""}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <ContestantAvatar imgUrl={c.img_url} name={c.name} size={36} />
                    <div className="min-w-0">
                      <span className="font-medium truncate block">{c.name}</span>
                      {val > 0 && (
                        <div
                          className="h-1 bg-primary rounded-full mt-1"
                          style={{ width: `${(val / 20) * 100}%`, minWidth: "0.5rem" }}
                        />
                      )}
                    </div>
                  </div>
                  {isLocked ? (
                    <span className="text-display text-lg tabular-nums w-10 text-center">
                      {val}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjust(c.id, -1)}
                        disabled={val === 0}
                        className="btn btn-outline btn-icon font-bold"
                      >
                        −
                      </button>
                      <span className="text-display text-lg tabular-nums w-10 text-center">
                        {val}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjust(c.id, 1)}
                        disabled={remaining === 0}
                        className="btn btn-outline btn-icon font-bold"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {isLocked ? (
        <div className="callout callout-warning mt-4 flex items-center gap-2">
          <span>🔒</span> Episode is locked — allocations are final.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <button type="submit" disabled={total !== 20 || isPending} className="btn btn-torch">
            {isPending ? "Saving…" : isEditing ? "Update Allocation" : "Submit Allocation"}
          </button>
          {result?.status === "ok" && (
            <div className="callout callout-success">Allocation saved!</div>
          )}
          {result?.status === "error" && (
            <div className="callout callout-danger">{result.error}</div>
          )}
        </div>
      )}
    </form>
  );
}
