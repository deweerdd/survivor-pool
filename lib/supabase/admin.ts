import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Uses service-role key which bypasses RLS — for admin writes only.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
