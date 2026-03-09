import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select()
    .eq("id", userId)
    .single();

  if (error) return null;
  return data as unknown as Profile;
}

export async function updateProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(updates as never)
    .eq("id", userId)
    .select()
    .single();

  if (error) return null;
  return data as unknown as Profile;
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .single();

  const row = data as unknown as { is_super_admin: boolean } | null;
  return row?.is_super_admin ?? false;
}
