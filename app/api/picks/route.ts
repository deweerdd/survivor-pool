import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertPicks } from "@/lib/db/picks";
import { submitPicksSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = submitPicksSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 }
    );
  }

  const { pool_id, episode_id, picks } = parsed.data;

  // Verify the episode isn't locked
  const { data: episode } = await supabase
    .from("episodes")
    .select("picks_lock_at")
    .eq("id", episode_id)
    .single();

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  if (new Date(episode.picks_lock_at) <= new Date()) {
    return NextResponse.json({ error: "Picks are locked for this episode" }, { status: 403 });
  }

  // Verify user is a member of the pool
  const { data: member } = await supabase
    .from("pool_members")
    .select("id")
    .eq("pool_id", pool_id)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Not a pool member" }, { status: 403 });
  }

  const result = await upsertPicks(
    picks.map((p) => ({
      ...p,
      pool_id,
      episode_id,
      user_id: user.id,
    }))
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Failed to save picks" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
