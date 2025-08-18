/**
 * Returns the current module's path so the worker pool knows what file to re-exec.
 * In Node ESM, __filename is undefined, so we fall back to argv[1].
 *
 * @returns The current module's path as a string
 */
export function getCurrentModulePath(): string {
  if (typeof __filename !== 'undefined') {
    return __filename as unknown as string;
  }
  return process.argv[1];
}
