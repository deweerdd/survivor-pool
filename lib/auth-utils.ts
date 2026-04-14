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

/**
 * Thrown by action-layer auth checks. Paired with `withAction` which converts
 * it into an `ActionResult` error so the form UI can surface the message.
 */
export class AuthError extends Error {
  constructor(message = "Not authenticated.") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Variant of `requireUser` for server actions that return an `ActionResult`.
 * Throws `AuthError` instead of redirecting — redirecting mid-form-submit
 * turns a field-level validation error into a navigation, which drops any
 * partial form state.
 */
export async function requireUserForAction(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AuthError();

  return { supabase, user };
}
