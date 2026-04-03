"use strict";

import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Unwraps a Supabase query result, throwing on error instead of silently ignoring it.
 * Use for queries where a failure should halt execution rather than produce null data.
 *
 * @example
 *   const pools = unwrap(await supabase.from("pools").select("*"));
 *   // pools is guaranteed non-null; throws if query failed
 */
export function unwrap<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) {
    throw new Error(`Supabase query failed: ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error("Supabase query returned null data without an error");
  }
  return result.data;
}
