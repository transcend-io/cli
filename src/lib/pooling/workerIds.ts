import type { ChildProcess } from 'node:child_process';

/**
 * Get the sorted list of worker IDs from a map of ChildProcess instances.
 *
 * @param m - Map of worker IDs to ChildProcess instances.
 * @returns Sorted array of worker IDs.
 */
export function getWorkerIds(m: Map<number, ChildProcess>): number[] {
  return [...m.keys()].sort((a, b) => a - b);
}

/**
 * Cycles through an array of numeric IDs, returning the next ID based on a delta.
 *
 * If the `current` ID is not provided or not found in the array, the first ID is used as the starting point.
 * The function then moves forward or backward in the array by `delta` positions, wrapping around if necessary.
 *
 * @param ids - Array of numeric IDs to cycle through.
 * @param current - The current ID to start cycling from. If `null` or not found, starts from the first ID.
 * @param delta - The number of positions to move forward (positive) or backward (negative) in the array.
 * @returns The next ID in the array after cycling, or `null` if the array is empty.
 */
export function cycleWorkers(
  ids: number[],
  current: number | null,
  delta: number,
): number | null {
  if (!ids.length) return null;
  const cur = current == null ? ids[0] : current;
  let i = ids.indexOf(cur);
  if (i === -1) i = 0;
  i = (i + delta + ids.length) % ids.length;
  return ids[i]!;
}
