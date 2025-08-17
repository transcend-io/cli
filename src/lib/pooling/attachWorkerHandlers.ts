import type { ChildProcess } from 'child_process';
import { assignWorkToWorker, type WorkerState } from './assignWorkToWorker';
import { appendFileSync } from 'fs';
import { join } from 'path';
import { spawnWorkerProcess } from './spawnWorkerProcess';

export interface WorkerResultMessage {
  /** Message type indicating a result */
  type: 'result';
  /** Result payload containing status and file info */
  payload: {
    /** Whether the operation was successful */
    ok: boolean /** */;
    /** Path to the processed file */
    filePath: string /** */;
    /** Optional error message if operation failed */
    error?: string;
  };
}

export interface WorkerReadyMessage {
  /** Message type indicating worker is ready */
  type: 'ready';
}

/**
 * Union type for worker messages
 */
export type WorkerMessage = WorkerResultMessage | WorkerReadyMessage;

/**
 * Wire up a worker's lifecycle:
 *  - on "ready": hand it work
 *  - on "result": update counters, queue next work
 *  - on "exit": optionally respawn if there is still work pending
 *
 * @param id - the worker ID
 * @param child - the child process
 * @param workers - the map of all worker processes
 * @param workerState - the map of worker states
 * @param state - the overall state
 * @param filesPending - the list of files pending processing
 * @param repaint - the function to call to repaint the dashboard
 * @param common - the common task options
 * @param onAllWorkersExited - the function to call when all workers have exited
 * @param logDir - the directory for log files
 * @param modulePath - the path to the current module (for spawning workers)
 * @param spawnSilent - whether to spawn workers silently
 */
export function attachWorkerHandlers<T>(
  id: number,
  child: ChildProcess,
  workers: Map<number, ChildProcess>,
  workerState: Map<number, WorkerState>,
  state: {
    /** Number of completed files */
    completed: number;
    /** Number of failed files */
    failed: number;
  },
  filesPending: string[],
  repaint: () => void,
  common: T,
  onAllWorkersExited: () => void,
  logDir: string,
  modulePath: string,
  spawnSilent = false,
): void {
  workers.set(id, child);
  workerState.set(id, { busy: false, file: null, startedAt: null });

  // Handle IPC messages from the child
  child.on('message', (msg: WorkerMessage) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'ready') {
      // First work assignment
      assignWorkToWorker(id, common, {
        pending: filesPending,
        workers,
        workerState,
        repaint,
      });
    } else if (msg.type === 'result') {
      // Update success/failure counters
      const { ok, filePath, error } = msg.payload;
      // eslint-disable-next-line no-param-reassign
      if (ok) state.completed += 1;
      // eslint-disable-next-line no-param-reassign
      else state.failed += 1;

      // Mark idle on completion
      workerState.set(id, { busy: false, file: null, startedAt: null });
      repaint();

      // Append failure details (if any) to a shared log
      if (!ok && error) {
        appendFileSync(
          join(logDir, 'failures.log'),
          `[${new Date().toISOString()}] worker ${id} file=${filePath}\n${error}\n\n`,
        );
      }

      // Keep the worker busy until the queue is empty
      assignWorkToWorker(id, common, {
        pending: filesPending,
        workers,
        workerState,
        repaint,
      });
    }
  });

  // Handle worker termination/crash
  child.on('exit', (code, signal) => {
    workers.delete(id);

    // If it crashed and there's still work to do, respawn a replacement
    if ((code && code !== 0) || signal) {
      if (filesPending.length > 0) {
        const replacement = spawnWorkerProcess(
          id,
          modulePath,
          logDir,
          true, // attempt to open tail windows for respawns too
          spawnSilent,
        );
        attachWorkerHandlers(
          id,
          replacement,
          workers,
          workerState,
          state,
          filesPending,
          repaint,
          common,
          onAllWorkersExited,
          logDir,
          modulePath,
        );
        return;
      }
    }

    // If all workers have exited, let the parent clean up
    if (workers.size === 0) onAllWorkersExited();
  });
}
