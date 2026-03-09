import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPool } from "@/lib/db/pools";
import { createPoolSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createPoolSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 }
    );
  }

  const pool = await createPool({
    ...parsed.data,
    commissioner_id: user.id,
  });

  if (!pool) {
    return NextResponse.json({ error: "Failed to create pool" }, { status: 500 });
  }

  return NextResponse.json(pool, { status: 201 });
}
