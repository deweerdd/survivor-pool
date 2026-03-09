"use client"; // Needs form interactions and elimination recording

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Episode, Season, Survivor } from "@/lib/types";

interface Props {
  episodes: Episode[];
  seasons: Season[];
  activeSeason: Season | null;
  survivors: Survivor[];
}

export function EpisodesTab({ episodes, seasons, activeSeason, survivors }: Props) {
  const [seasonId, setSeasonId] = useState(activeSeason?.id ?? "");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [airDate, setAirDate] = useState("");
  const [picksLockAt, setPicksLockAt] = useState("");
  const [resultsReleaseAt, setResultsReleaseAt] = useState("");
  const [saving, setSaving] = useState(false);

  // Elimination state
  const [selectedEpisode, setSelectedEpisode] = useState("");
  const [selectedSurvivor, setSelectedSurvivor] = useState("");
  const [eliminating, setEliminating] = useState(false);

  const router = useRouter();

  async function handleCreateEpisode() {
    setSaving(true);
    const res = await fetch("/api/admin/episodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        season_id: seasonId,
        episode_number: parseInt(episodeNumber),
        air_date: new Date(airDate).toISOString(),
        picks_lock_at: new Date(picksLockAt).toISOString(),
        results_release_at: new Date(resultsReleaseAt).toISOString(),
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(json.error ?? "Failed to create episode");
      return;
    }

    toast.success("Episode created!");
    setEpisodeNumber("");
    router.refresh();
  }

  async function handleEliminate() {
    if (!selectedEpisode || !selectedSurvivor) return;
    setEliminating(true);

    const res = await fetch("/api/admin/eliminations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episode_id: selectedEpisode,
        survivor_id: selectedSurvivor,
      }),
    });

    const json = await res.json();
    setEliminating(false);

    if (!res.ok) {
      toast.error(json.error ?? "Failed to record elimination");
      return;
    }

    toast.success("Elimination recorded!");
    setSelectedSurvivor("");
    router.refresh();
  }

  const activeSurvivors = survivors.filter((s) => s.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Episode</CardTitle>
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
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Episode #</Label>
              <Input
                type="number"
                placeholder="1"
                value={episodeNumber}
                onChange={(e) => setEpisodeNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Air Date</Label>
              <Input
                type="datetime-local"
                value={airDate}
                onChange={(e) => setAirDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Picks Lock At</Label>
              <Input
                type="datetime-local"
                value={picksLockAt}
                onChange={(e) => setPicksLockAt(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Results Release At</Label>
              <Input
                type="datetime-local"
                value={resultsReleaseAt}
                onChange={(e) => setResultsReleaseAt(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleCreateEpisode} disabled={saving}>
            {saving ? "Creating..." : "Create Episode"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record Elimination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Episode</Label>
              <select
                value={selectedEpisode}
                onChange={(e) => setSelectedEpisode(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select episode...</option>
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    Episode {ep.episode_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Survivor Eliminated</Label>
              <select
                value={selectedSurvivor}
                onChange={(e) => setSelectedSurvivor(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select survivor...</option>
                {activeSurvivors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button
            onClick={handleEliminate}
            disabled={eliminating || !selectedEpisode || !selectedSurvivor}
            variant="destructive"
          >
            {eliminating ? "Recording..." : "Record Elimination"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="font-medium text-sm text-gray-700">Episodes</h3>
        {episodes.length === 0 ? (
          <p className="text-sm text-gray-400">No episodes yet.</p>
        ) : (
          episodes.map((ep) => (
            <div
              key={ep.id}
              className="flex items-center justify-between bg-white border rounded-lg px-4 py-3"
            >
              <div>
                <p className="font-medium text-sm">Episode {ep.episode_number}</p>
                <p className="text-xs text-gray-400">
                  Locks {new Date(ep.picks_lock_at).toLocaleString()}
                </p>
              </div>
              {new Date(ep.results_release_at) <= new Date() && (
                <Badge variant="secondary">Results released</Badge>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
