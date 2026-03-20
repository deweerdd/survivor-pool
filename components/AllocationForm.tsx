"use client";

import { useActionState } from "react";
import ContestantAvatar from "@/components/ContestantAvatar";

type Contestant = { id: number; name: string; img_url?: string | null };
type TribeGroup = { tribe: string; members: Contestant[] };

type Props = {
  contestants: TribeGroup[];
  existingAllocation: Record<number, number>;
  episodeId: number;
  poolId: number;
  episodeNumber: number;
  isLocked: boolean;
  submitAction: (prevState: string | null, formData: FormData) => Promise<string | null>;
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

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-1">
          Episode {episodeNumber} — Allocate Your 20 Points
        </h2>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>
            Points remaining:{" "}
            <span
              className={
                remaining === 0
                  ? "font-semibold text-green-600"
                  : remaining < 0
                    ? "font-semibold text-red-600"
                    : "font-semibold"
              }
            >
              {remaining}
            </span>{" "}
            / 20
          </span>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(100, (total / 20) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {contestants.map((group) => (
        <div key={group.tribe} className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 border-b pb-1">
            {group.tribe}
          </h3>
          <div className="space-y-2">
            {group.members.map((c) => {
              const val = points[c.id] ?? 0;
              return (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ContestantAvatar imgUrl={c.img_url} name={c.name} size={28} />
                    <span className="text-sm truncate">{c.name}</span>
                  </div>
                  {isLocked ? (
                    <span className="text-sm tabular-nums w-8 text-center font-medium">{val}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjust(c.id, -1)}
                        disabled={val === 0}
                        className="w-7 h-7 rounded border text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                      >
                        −
                      </button>
                      <span className="text-sm tabular-nums w-6 text-center font-medium">
                        {val}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjust(c.id, 1)}
                        disabled={remaining === 0}
                        className="w-7 h-7 rounded border text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
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
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600 font-medium">
          <span>🔒</span> Episode is locked
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={total !== 20 || isPending}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Saving…" : isEditing ? "Update Allocation" : "Submit Allocation"}
          </button>
          {result === "ok" && (
            <span className="text-sm text-green-600 font-medium">Allocation saved!</span>
          )}
          {result && result !== "ok" && <span className="text-sm text-red-600">{result}</span>}
        </div>
      )}
    </form>
  );
}
