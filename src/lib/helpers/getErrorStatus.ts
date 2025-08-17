/**
 * Extract an HTTP status code from a thrown error (got compatible).
 *
 * @param err - Unknown error thrown by network call
 * @returns HTTP status code, if present
 */
export function getErrorStatus(err: unknown): number | undefined {
  // Swallow unknowns carefully—never throw from an error handler.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  return anyErr?.response?.statusCode ?? anyErr?.response?.status;
}
