/**
 * Standardized return type for server actions.
 *
 * User-facing actions return this instead of throwing, so the UI can display
 * errors inline. Admin actions may still throw since errors are exceptional
 * and caught by error boundaries.
 */
export type ActionResult = { status: "ok" } | { status: "error"; error: string };

/**
 * Wraps a server-action body so thrown `Error`s become `ActionResult` errors.
 * Lets actions use straight-line code with `requireUserForAction()`,
 * `requireInt()`, etc. — any thrown message surfaces to the form UI.
 *
 * If the body returns nothing, the wrapper assumes success and returns
 * `{ status: "ok" }`.
 */
export async function withAction(fn: () => Promise<ActionResult | void>): Promise<ActionResult> {
  try {
    const result = await fn();
    return result ?? { status: "ok" };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unexpected error.";
    return { status: "error", error };
  }
}
