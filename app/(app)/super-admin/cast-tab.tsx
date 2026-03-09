"use client"; // Needs form interactions

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Season, Survivor } from "@/lib/types";

interface Props {
  survivors: Survivor[];
  seasons: Season[];
  activeSeason: Season | null;
}

export function CastTab({ survivors, seasons, activeSeason }: Props) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [seasonId, setSeasonId] = useState(activeSeason?.id ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    if (!name || !seasonId) return;
    setSaving(true);

    const res = await fetch("/api/admin/survivors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        season_id: seasonId,
        image_url: imageUrl || undefined,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(json.error ?? "Failed to add survivor");
      return;
    }

    toast.success(`${name} added to cast!`);
    setName("");
    setImageUrl("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Survivor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Season</Label>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                placeholder="Jeff Probst"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Photo URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? "Adding..." : "Add Survivor"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {survivors.map((survivor) => (
          <div
            key={survivor.id}
            className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2"
          >
            {survivor.image_url ? (
              <img
                src={survivor.image_url}
                alt={survivor.name}
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500 shrink-0">
                {survivor.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{survivor.name}</p>
            </div>
            {!survivor.is_active && (
              <Badge variant="secondary" className="text-xs shrink-0">
                Eliminated
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
