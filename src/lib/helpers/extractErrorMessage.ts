/**
 * Extract a human-readable error message from a thrown error.
 *
 * Tries to parse JSON bodies that follow common REST/GraphQL error patterns:
 *   { error: { message: string } }
 *   { errors: [{ message: string }, ...] }
 *
 * Falls back to `err.message` or 'Unknown error'.
 *
 * @param err - Unknown error thrown by network call
 * @returns A concise error string safe to log/show
 */
export function extractErrorMessage(err: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  let errorMsg = anyErr?.response?.body || anyErr?.message || 'Unknown error';

  // Try to parse as JSON; if not parsable, leave as-is.
  try {
    const parsed = JSON.parse(errorMsg);
    // Typical shapes: errors[], error.errors[], error.message
    const candidates = parsed.errors ||
      parsed.error?.errors || [parsed.error?.message || parsed.error];

    const msgs = Array.isArray(candidates) ? candidates : [candidates];
    errorMsg = msgs.filter(Boolean).join(', ');
  } catch {
    // not JSON, ignore
  }
  return errorMsg;
}
