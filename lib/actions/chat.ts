"use server";

import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/lib/auth-utils";
import { MAX_INT, requireInt } from "@/lib/validation";
import { type ActionResult, withAction } from "@/lib/actions/types";
import { validateMessageBody } from "@/lib/chat";

export async function sendChatMessageAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return withAction(async () => {
    const { supabase, user } = await requireUserForAction();

    const poolId = requireInt(formData.get("poolId"), "Pool", { min: 1, max: MAX_INT });
    const rawBody = formData.get("body");
    const validated = validateMessageBody(typeof rawBody === "string" ? rawBody : "");
    if (!validated.ok) throw new Error(validated.error);

    // Private-pool gate: chat only exists for private pools.
    const { data: pool } = await supabase
      .from("pools")
      .select("id, is_public")
      .eq("id", poolId)
      .single();
    if (!pool) throw new Error("Pool not found.");
    if (pool.is_public) throw new Error("Chat is disabled for public pools.");

    // Membership check (RLS would also block the insert, but surface a clean error).
    const { data: memberCheck } = await supabase
      .from("pool_members")
      .select("user_id")
      .eq("pool_id", poolId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!memberCheck) throw new Error("You are not a member of this pool.");

    const { error } = await supabase.from("chat_messages").insert({
      pool_id: poolId,
      user_id: user.id,
      body: validated.body,
    });
    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/pools/${poolId}`);
  });
}

export async function deleteChatMessageFormAction(formData: FormData): Promise<void> {
  await deleteChatMessageAction(null, formData);
}

export async function deleteChatMessageAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return withAction(async () => {
    const { supabase } = await requireUserForAction();

    const messageId = requireInt(formData.get("messageId"), "Message", { min: 1, max: MAX_INT });
    const poolId = requireInt(formData.get("poolId"), "Pool", { min: 1, max: MAX_INT });

    // RLS enforces author-only delete.
    const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/pools/${poolId}`);
  });
}
