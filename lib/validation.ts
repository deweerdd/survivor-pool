// Small validators for server-action input. Throws Error on invalid input so
// the action surfaces a clean message to the caller.

export function requireString(
  value: FormDataEntryValue | null,
  field: string,
  opts: { min?: number; max: number; required?: boolean } = { max: 0 }
): string | null {
  const { min = 1, max, required = true } = opts;
  if (typeof value !== "string") {
    if (required) throw new Error(`${field} is required`);
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new Error(`${field} is required`);
    return null;
  }
  if (trimmed.length < min) throw new Error(`${field} must be at least ${min} characters`);
  if (trimmed.length > max) throw new Error(`${field} must be at most ${max} characters`);
  return trimmed;
}

export function requireInt(
  value: FormDataEntryValue | null,
  field: string,
  opts: { min: number; max: number }
): number {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`${field} must be an integer`);
  if (n < opts.min || n > opts.max)
    throw new Error(`${field} must be between ${opts.min} and ${opts.max}`);
  return n;
}

export function optionalUrl(
  value: FormDataEntryValue | null,
  field: string,
  maxLength = 2000
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength)
    throw new Error(`${field} must be at most ${maxLength} characters`);
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${field} must be a valid URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${field} must be an http(s) URL`);
  }
  return trimmed;
}

export function optionalDate(value: FormDataEntryValue | null, field: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Require ISO calendar date (YYYY-MM-DD) to match the `date` column type.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`${field} must be in YYYY-MM-DD format`);
  }
  const d = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`${field} is not a valid date`);
  return trimmed;
}
