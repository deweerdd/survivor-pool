/**
 * Standardized return type for server actions.
 *
 * User-facing actions return this instead of throwing, so the UI can display
 * errors inline. Admin actions may still throw since errors are exceptional
 * and caught by error boundaries.
 */
export type ActionResult = { status: "ok" } | { status: "error"; error: string };
