"use client"; // Needs form interactions

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Season } from "@/lib/types";

export function SeasonsTab({ seasons }: { seasons: Season[] }) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    if (!name || !number) return;
    setSaving(true);

    const res = await fetch("/api/admin/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, number: parseInt(number) }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(json.error ?? "Failed to create season");
      return;
    }

    toast.success("Season created!");
    setName("");
    setNumber("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Season</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Season Name</Label>
              <Input
                placeholder="Survivor 47"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Season Number</Label>
              <Input
                type="number"
                placeholder="47"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Creating..." : "Create Season"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {seasons.map((season) => (
          <div
            key={season.id}
            className="flex items-center justify-between bg-white border rounded-lg px-4 py-3"
          >
            <div>
              <p className="font-medium text-sm">{season.name}</p>
              <p className="text-xs text-gray-400">Season {season.number}</p>
            </div>
            {season.is_active && <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}
