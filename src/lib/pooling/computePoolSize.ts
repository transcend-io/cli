import { availableParallelism } from 'node:os';

/**
 * Decide how many worker processes to spawn:
 * - If `concurrency` is set and > 0, use that (capped by file count).
 * - Otherwise, use availableParallelism (capped by file count).
 * Returns both pool size and CPU count for display.
 *
 * @param concurrency - Optional concurrency setting, defaults to undefined
 * @param filesCount - The number of files to process
 * @returns An object with `poolSize` and `cpuCount`
 */
export function computePoolSize(
  concurrency: number | undefined,
  filesCount: number,
): {
  /** The number of worker processes to spawn */
  poolSize: number;
  /** The number of CPU cores available for parallel processing */
  cpuCount: number;
} {
  const cpuCount = Math.max(1, availableParallelism?.() ?? 1);
  const desired =
    typeof concurrency === 'number' && concurrency > 0
      ? Math.min(concurrency, filesCount)
      : Math.min(cpuCount, filesCount);
  return { poolSize: desired, cpuCount };
}
