"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/types";
import { validateMessageBody } from "@/lib/chat";

export async function sendChatMessageAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Not authenticated." };

  const poolId = Number(formData.get("poolId"));
  const rawBody = (formData.get("body") ?? "") as string;

  if (!poolId) return { status: "error", error: "Missing pool." };

  const validated = validateMessageBody(rawBody);
  if (!validated.ok) return { status: "error", error: validated.error };

  // Private-pool gate: chat only exists for private pools.
  const { data: pool } = await supabase
    .from("pools")
    .select("id, is_public")
    .eq("id", poolId)
    .single();
  if (!pool) return { status: "error", error: "Pool not found." };
  if (pool.is_public) return { status: "error", error: "Chat is disabled for public pools." };

  // Membership check (RLS would also block the insert, but surface a clean error).
  const { data: memberCheck } = await supabase
    .from("pool_members")
    .select("user_id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!memberCheck) return { status: "error", error: "You are not a member of this pool." };

  const { error } = await supabase.from("chat_messages").insert({
    pool_id: poolId,
    user_id: user.id,
    body: validated.body,
  });
  if (error) return { status: "error", error: error.message };

  revalidatePath(`/dashboard/pools/${poolId}`);
  return { status: "ok" };
}

export async function deleteChatMessageFormAction(formData: FormData): Promise<void> {
  await deleteChatMessageAction(null, formData);
}

export async function deleteChatMessageAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Not authenticated." };

  const messageId = Number(formData.get("messageId"));
  const poolId = Number(formData.get("poolId"));
  if (!messageId || !poolId) return { status: "error", error: "Missing message or pool." };

  // RLS enforces author-only delete.
  const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
  if (error) return { status: "error", error: error.message };

  revalidatePath(`/dashboard/pools/${poolId}`);
  return { status: "ok" };
}
