"use client"; // Needs form interaction

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Season } from "@/lib/types";

export function CreatePoolButton({
  seasons,
  userId: _userId,
}: {
  seasons: Season[];
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);

    const res = await fetch("/api/pools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, season_id: seasonId }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(json.error ?? "Failed to create pool");
      return;
    }

    toast.success("Pool created!");
    setOpen(false);
    setName("");
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Create Pool</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Pool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="pool-name">Pool Name</Label>
              <Input
                id="pool-name"
                placeholder="My Survivor Pool"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="season">Season</Label>
              <select
                id="season"
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
            <Button onClick={handleCreate} disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Pool"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
