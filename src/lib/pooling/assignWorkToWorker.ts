import type { ChildProcess } from 'node:child_process';

export interface WorkerState {
  /** Indicates if the worker is currently processing a task. */
  busy: boolean;
  /** The file path currently being processed by the worker, or null if idle. */
  file?: string | null;
  /** Timestamp when the worker started processing the current task, or null if idle. */
  startedAt?: number | null;
  /** last severity seen from worker stderr */
  lastLevel?: 'ok' | 'warn' | 'error';
}

/**
 * Assigns a pending work item to a specified worker process.
 *
 * This function checks if the worker is available and connected, then assigns the next file path from the pending queue.
 * It updates the worker's state, triggers a UI repaint, and sends the task to the worker via IPC.
 * If no work is left, it marks the worker as idle.
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
  // Grab the worker by ID
  const w = workers.get(id);

  // Check if worker is running
  if (!w || !w.connected || !w.channel) {
    // mark slot idle and skip (slot is kept for post-run log viewing)
    workerState.set(id, { busy: false, file: null, startedAt: null });
    return;
  }

  // Grab a file that needs to be processed
  const filePath = pending.shift();
  if (!filePath) {
    // No work left; mark idle
    workerState.set(id, { busy: false, file: null, startedAt: null });
    repaint();
    return;
  }

  // Update dashboard state
  workerState.set(id, { busy: true, file: filePath, startedAt: Date.now() });
  repaint();

  // Send work item over IPC
  w.send?.({
    type: 'task',
    payload: {
      filePath,
      options: payload,
    },
  });
}
