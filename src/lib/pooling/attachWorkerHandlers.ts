import type { ChildProcess } from 'child_process';
import { assignWorkToWorker, type WorkerState } from './assignWorkToWorker';
import { appendFileSync } from 'fs';
import { join } from 'path';
import { spawnWorkerProcess } from './spawnWorkerProcess';
import { classifyLogLevel, makeLineSplitter } from './logRotation';

/** Result message from child → parent */
export interface WorkerResultMessage {
  /** */
  type: 'result';
  /** */
  payload: {
    /** */
    ok: boolean;
    /** */
    filePath: string;
    /** */
    error?: string;
    /** Optional receipts path, if child provided it */
    receiptFilepath?: string;
  };
}

/** Ready sentinel from child → parent */
export interface WorkerReadyMessage {
  /** */
  type: 'ready';
}

/** Live progress from child → parent (for per-worker bars & throughput) */
export interface WorkerProgressMessage {
  /** */
  type: 'progress';
  /** */
  payload: {
    /** */
    filePath: string;
    /** how many just succeeded in this tick */
    successDelta: number;
    /** cumulative successes for the current file */
    successTotal: number;
    /** total planned records for the current file */
    fileTotal: number;
  };
}

/** Union of all worker IPC messages */
export type WorkerMessage =
  | WorkerResultMessage
  | WorkerReadyMessage
  | WorkerProgressMessage;

/**
 * Wire up a worker's lifecycle:
 *  - on "ready": hand it work
 *  - on "progress": update per-worker progress (and optional aggregator)
 *  - on "result": update counters, clear progress, queue next work
 *  - on "exit": optionally respawn if there is still work pending
 *
 * @param id - the worker ID
 * @param child - the child process
 * @param workers - map of all worker processes
 * @param workerState - map of worker visual state
 * @param state - global counters (completed/failed files)
 * @param filesPending - FIFO of files yet to process
 * @param repaint - re-render the dashboard
 * @param common - common task options to send with each assignment
 * @param onAllWorkersExited - callback when pool is fully drained/exited
 * @param logDir - directory to write shared failure logs
 * @param modulePath - module path for spawning worker processes
 * @param spawnSilent - whether to spawn workers with silent stdio
 * @param onProgress - optional aggregator for throughput metrics
 */
export function attachWorkerHandlers<T>(
  id: number,
  child: ChildProcess,
  workers: Map<number, ChildProcess>,
  workerState: Map<number, WorkerState>,
  state: {
    /** */
    completed: number;
    /** */
    failed: number;
  },
  filesPending: string[],
  repaint: () => void,
  common: T,
  onAllWorkersExited: () => void,
  logDir: string,
  modulePath: string,
  spawnSilent = false,
  onProgress?: (info: {
    /** */
    workerId: number;
    /** */
    filePath: string;
    /** */
    successDelta: number;
    /** */
    successTotal: number;
    /** */
    fileTotal: number;
  }) => void,
): void {
  workers.set(id, child);
  const prev = workerState.get(id);
  workerState.set(id, {
    busy: false,
    file: null,
    startedAt: null,
    lastLevel: prev?.lastLevel ?? 'ok', // preserve previous badge (e.g., ERROR after crash)
    progress: undefined,
  });

  // LIVE: watch stderr to flip WARN/ERROR badges
  if (child.stderr) {
    const onErrLine = makeLineSplitter((line) => {
      // If there is an explicit tag, use it; otherwise since it came from stderr, treat as WARN.
      const explicit = classifyLogLevel(line); // returns 'warn' | 'error' | null
      const lvl = explicit ?? 'warn';
      const prev = workerState.get(id)!;
      if (prev.lastLevel !== lvl) {
        workerState.set(id, { ...prev, lastLevel: lvl });
        repaint();
      }
    });
    child.stderr.on('data', onErrLine);
  }

  // IPC messages from child
  child.on('message', (msg: WorkerMessage) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'ready') {
      assignWorkToWorker(id, common, {
        pending: filesPending,
        workers,
        workerState,
        repaint,
      });
      return;
    }

    if (msg.type === 'progress') {
      const { filePath, successDelta, successTotal, fileTotal } = msg.payload;

      // Update per-worker progress bar
      const current = workerState.get(id)!;
      workerState.set(id, {
        ...current,
        file: current.file ?? filePath,
        progress: {
          processed: successTotal ?? current.progress?.processed ?? 0,
          total: fileTotal ?? current.progress?.total ?? 0,
        },
      });

      // Bubble to an optional global aggregator (for throughput)
      if (onProgress && successDelta) {
        onProgress({
          workerId: id,
          filePath,
          successDelta,
          successTotal,
          fileTotal,
        });
      }

      repaint();
      return;
    }

    if (msg.type === 'result') {
      const { ok, filePath, error } = msg.payload;

      // Update file-level counters
      if (ok) state.completed += 1;
      else state.failed += 1;

      // Mark idle & clear transient progress; keep ERROR badge if the task failed
      const current = workerState.get(id)!;
      workerState.set(id, {
        ...current,
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: ok ? 'ok' : 'error',
        progress: undefined,
      });
      repaint();

      // If failure, append to a shared log for triage
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

  child.on('exit', (code, signal) => {
    workers.delete(id);

    // Mark the slot visibly as ERROR (crashed) and keep it until a new task is assigned
    workerState.set(id, {
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'error',
      progress: undefined,
    });
    repaint();

    // If it crashed and there's still work to do, respawn a replacement
    if ((code && code !== 0) || signal) {
      if (filesPending.length > 0) {
        const replacement = spawnWorkerProcess({
          id,
          modulePath,
          logDir,
          openLogWindows: true, // attempt to open tail windows for respawns too
          isSilent: spawnSilent,
        });
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
          spawnSilent,
          onProgress,
        );
        return;
      }
    }

    // If all workers have exited, let the parent clean up
    if (workers.size === 0) onAllWorkersExited();
  });
}
