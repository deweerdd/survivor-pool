import { requireUser } from "@/lib/auth-utils";

/**
 * Verifies the current user is an admin. Throws if not.
 * Use at the top of every admin server action.
 *
 * Defense-in-depth: admin protection is also enforced in middleware and
 * app/admin/layout.tsx. This guard protects server actions that can be
 * invoked directly via crafted POST requests (see decisions.md).
 */
export async function requireAdmin(): Promise<string> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Forbidden: admin access required");

  return user.id;
}
