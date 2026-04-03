import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AuthResult = {
  supabase: SupabaseClient<Database>;
  user: User;
};

/**
 * Authenticates the current user via supabase.auth.getUser() (never getSession).
 * Redirects to /login if not authenticated.
 * Returns both the supabase client and user so callers don't repeat the boilerplate.
 */
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return { supabase, user };
}
