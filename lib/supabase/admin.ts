import { createClient } from '@supabase/supabase-js'

// SERVER-ONLY. Never import this in Client Components or any browser-bundled file.
// Uses service-role key which bypasses RLS — for admin writes only.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
