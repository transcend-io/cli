import type { ChildProcess } from 'node:child_process';
import { isIpcOpen, safeSend, type WorkerLogPaths } from './spawnWorkerProcess';
import type { WorkerState } from './assignWorkToWorker';

/**
 * Assigns work to a specific worker slot.
 */
export type WorkerMaps = {
  /** Map of worker IDs to their ChildProcess instances */
  workers: Map<number, ChildProcess>;
  /** Map of worker IDs to their state, including progress and last log level */
  workerState: Map<number, WorkerState>;
  /** Queue of file paths pending processing */
  slotLogPaths: Map<number, WorkerLogPaths | undefined>;
};

/**
 * Assigns work to a specific worker slot.
 *
 * @param id - The worker slot ID to assign work to
 * @param filesQueue - The queue of file paths to process
 * @param commonOpts - Common options to send with the work assignment
 * @param maps - Maps containing workers and their states
 */
export function assignWorkToSlot(
  id: number,
  filesQueue: string[],
  commonOpts: unknown,
  maps: WorkerMaps,
): void {
  const { workers, workerState } = maps;
  const w = workers.get(id);

  // mark idle if IPC closed
  if (!isIpcOpen(w)) {
    const prev = workerState.get(id);
    workerState.set(id, {
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: prev?.lastLevel ?? 'ok',
      progress: undefined,
    });
    return;
  }

  const filePath = filesQueue.shift();
  if (!filePath) {
    const prev = workerState.get(id);
    workerState.set(id, {
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: prev?.lastLevel ?? 'ok',
      progress: undefined,
    });
    return;
  }

  workerState.set(id, {
    busy: true,
    file: filePath,
    startedAt: Date.now(),
    lastLevel: 'ok',
    progress: undefined,
  });

  if (
    !safeSend(w!, { type: 'task', payload: { filePath, options: commonOpts } })
  ) {
    // IPC closed between check and send; re-queue and mark idle
    filesQueue.unshift(filePath);
    const prev = workerState.get(id);
    workerState.set(id, {
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: prev?.lastLevel ?? 'ok',
      progress: undefined,
    });
  }
}

/**
 * Refill idle workers with pending files.
 *
 * @param filesQueue - The queue of file paths to process
 * @param maps - Maps containing workers and their states
 * @param assign - Function to assign work to a worker
 */
export function refillIdleWorkers(
  filesQueue: string[],
  maps: WorkerMaps,
  assign: (id: number) => void,
): void {
  for (const [id] of maps.workers) {
    const st = maps.workerState.get(id);
    if (!st || !st.busy) {
      if (filesQueue.length === 0) break;
      assign(id);
    }
  }
}
