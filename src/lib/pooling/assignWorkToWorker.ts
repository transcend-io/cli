import type { ChildProcess } from 'node:child_process';
import { isIpcOpen } from './spawnWorkerProcess';

export interface WorkerState {
  /** True when the worker is executing a task */
  busy: boolean;
  /** Absolute file path currently being processed (if any) */
  file: string | null;
  /** Start timestamp (ms) when the current task began */
  startedAt: number | null;
  /**
   * Last log level observed on stderr.
   * 'ok' = normal, 'warn' = warning, 'error' = error
   */
  lastLevel: 'ok' | 'warn' | 'error';

  /**
   * Live progress reported by the child process.
   * `total` is the total number of records for the current file.
   * `processed` is the cumulative number processed so far.
   */
  progress?: {
    /** Cumulative items processed so far for this file */
    processed: number;
    /** Total number of items to process for this file */
    total: number;
  };
}

/**
 * Assign a pending work item to a specified worker process.
 *
 * Checks if the worker is available and connected, then assigns the next file from the
 * pending queue. Updates the worker's state (including `lastLevel` and `progress`),
 * triggers a UI repaint, and sends the task to the worker via IPC. If no work is left,
 * marks the worker as idle. If IPC is closed during send, requeues the work and idles.
 *
 * @param id - The worker's unique identifier.
 * @param payload - Common payload/options to send with each task.
 * @param options - Object containing pending, workers, workerState, and repaint.
 */
export function assignWorkToWorker<T>(
  id: number,
  payload: T,
  {
    pending,
    workerState,
    workers,
    repaint,
  }: {
    /** Pending files to be processed */
    pending: string[];
    /** Map of worker IDs to their corresponding ChildProcess instances. */
    workers: Map<number, ChildProcess>;
    /** Map of worker IDs to their current WorkerState. */
    workerState: Map<number, WorkerState>;
    /** Function to repaint the UI/dashboard after state changes. */
    repaint: () => void;
  },
): void {
  const w = workers.get(id);
  const prev = workerState.get(id);

  // If worker IPC isn't open, mark idle (keep lastLevel so badge persists)
  if (!isIpcOpen(w)) {
    workerState.set(id, {
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: prev?.lastLevel ?? 'ok',
      progress: undefined,
    });
    return;
  }

  // Take next file
  const filePath = pending.shift();
  if (!filePath) {
    workerState.set(id, {
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: prev?.lastLevel ?? 'ok',
      progress: undefined,
    });
    repaint();
    return;
  }

  // Mark working (child will later send progress updates)
  workerState.set(id, {
    busy: true,
    file: filePath,
    startedAt: Date.now(),
    lastLevel: 'ok', // becomes OK when a fresh task starts
    progress: undefined,
  });
  repaint();

  // Send task
  try {
    w!.send?.({
      type: 'task',
      payload: {
        filePath,
        options: payload,
      },
    });
  } catch (err: any) {
    // If the pipe closed between the check and send: requeue + idle
    if (
      err?.code === 'ERR_IPC_CHANNEL_CLOSED' ||
      err?.code === 'EPIPE' ||
      err?.errno === -32
    ) {
      pending.unshift(filePath);
      workerState.set(id, {
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: prev?.lastLevel ?? 'ok',
        progress: undefined,
      });
      repaint();
      return;
    }
    throw err;
  }
}
