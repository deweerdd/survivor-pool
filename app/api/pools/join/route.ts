import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPoolByInviteCode, joinPool } from "@/lib/db/pools";

const schema = z.object({
  invite_code: z.string().min(1),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }

  const pool = await getPoolByInviteCode(parsed.data.invite_code);

  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  const success = await joinPool(pool.id, user.id);

  if (!success) {
    return NextResponse.json({ error: "Failed to join pool" }, { status: 500 });
  }

  return NextResponse.json({ pool_id: pool.id });
}
