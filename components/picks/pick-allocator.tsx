"use client"; // Needs interactive point sliders/inputs

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MAX_POINTS_PER_EPISODE } from "@/lib/validations";
import type { Pick, Survivor } from "@/lib/types";

interface Props {
  survivors: Survivor[];
  poolId: string;
  episodeId: string;
  userId: string;
  existingPicks: Pick[];
  poolPageHref: string;
}

export function PickAllocator({
  survivors,
  poolId,
  episodeId,
  userId,
  existingPicks,
  poolPageHref,
}: Props) {
  const router = useRouter();

  // Initialize points from existing picks
  const [points, setPoints] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const pick of existingPicks) {
      init[pick.survivor_id] = pick.points;
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  const totalAllocated = Object.values(points).reduce((s, p) => s + p, 0);
  const remaining = MAX_POINTS_PER_EPISODE - totalAllocated;

  function setPointsForSurvivor(survivorId: string, value: number) {
    const clamped = Math.max(0, Math.min(value, MAX_POINTS_PER_EPISODE));
    const currentForOthers = totalAllocated - (points[survivorId] ?? 0);
    const allowed = Math.min(clamped, MAX_POINTS_PER_EPISODE - currentForOthers);
    setPoints((prev) => ({ ...prev, [survivorId]: allowed }));
  }

  async function handleSave() {
    setSaving(true);

    const picks = Object.entries(points)
      .filter(([, pts]) => pts > 0)
      .map(([survivor_id, pts]) => ({
        survivor_id,
        points: pts,
        pool_id: poolId,
        episode_id: episodeId,
        user_id: userId,
      }));

    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pool_id: poolId, episode_id: episodeId, picks }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(json.error ?? "Failed to save picks");
      return;
    }

    toast.success("Picks saved!");
    router.push(poolPageHref);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Budget indicator */}
      <div className="flex items-center justify-between bg-white border rounded-xl px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm text-gray-500">Points allocated</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalAllocated}{" "}
            <span className="text-base font-normal text-gray-400">
              / {MAX_POINTS_PER_EPISODE}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Remaining</p>
          <p
            className={`text-2xl font-bold ${
              remaining === 0
                ? "text-emerald-600"
                : remaining < 0
                ? "text-red-600"
                : "text-gray-900"
            }`}
          >
            {remaining}
          </p>
        </div>
      </div>

      {/* Survivor list */}
      <div className="space-y-2">
        {survivors.map((survivor) => {
          const pts = points[survivor.id] ?? 0;
          return (
            <Card key={survivor.id} className="overflow-hidden">
              <CardContent className="flex items-center gap-4 py-3 px-4">
                {survivor.image_url ? (
                  <img
                    src={survivor.image_url}
                    alt={survivor.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-sm font-medium text-gray-500">
                    {survivor.name[0]}
                  </div>
                )}

                <span className="flex-1 font-medium text-sm">{survivor.name}</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPointsForSurvivor(survivor.id, pts - 1)}
                    disabled={pts === 0}
                    className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min={0}
                    max={MAX_POINTS_PER_EPISODE}
                    value={pts}
                    onChange={(e) =>
                      setPointsForSurvivor(survivor.id, parseInt(e.target.value) || 0)
                    }
                    className="w-10 text-center text-sm font-mono border border-gray-200 rounded-md py-1"
                  />

                  <button
                    onClick={() => setPointsForSurvivor(survivor.id, pts + 1)}
                    disabled={remaining <= 0}
                    className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>

                {pts > 0 && (
                  <Badge className="min-w-[2rem] justify-center bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    {pts}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => router.push(poolPageHref)}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || totalAllocated === 0}
          className="flex-1"
        >
          {saving ? "Saving..." : "Save Picks"}
        </Button>
      </div>
    </div>
  );
}
