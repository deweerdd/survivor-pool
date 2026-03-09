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

export function JoinPoolButton() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleJoin() {
    if (!code.trim()) return;
    setLoading(true);

    const res = await fetch("/api/pools/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(json.error ?? "Failed to join pool");
      return;
    }

    toast.success("Joined pool!");
    setOpen(false);
    router.push(`/pool/${json.pool_id}`);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Join Pool
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Pool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="ABCD1234"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono uppercase"
                maxLength={8}
              />
            </div>
            <Button onClick={handleJoin} disabled={loading} className="w-full">
              {loading ? "Joining..." : "Join Pool"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
