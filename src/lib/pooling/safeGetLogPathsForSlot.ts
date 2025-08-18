import type { ChildProcess } from 'node:child_process';
import {
  getWorkerLogPaths,
  isIpcOpen,
  type WorkerLogPaths,
} from './spawnWorkerProcess';

/**
 * Safely retrieve log paths for a worker slot.
 *
 * @param id - The worker slot ID
 * @param workers - Map of worker IDs to their ChildProcess instances
 * @param slotLogPaths - Map of worker IDs to their log paths
 * @returns The log paths for the worker slot, or undefined if not available
 */
export function safeGetLogPathsForSlot(
  id: number,
  workers: Map<number, ChildProcess>,
  slotLogPaths: Map<number, WorkerLogPaths | undefined>,
): WorkerLogPaths | undefined {
  const live = workers.get(id);
  if (isIpcOpen(live)) {
    try {
      const p = getWorkerLogPaths(live!);
      if (p !== undefined && p !== null) return p;
    } catch {
      /* fall back */
    }
  }
  return slotLogPaths.get(id);
}
