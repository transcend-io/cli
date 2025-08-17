// attachWorkerHandlers.ts
import type { ChildProcess } from 'node:child_process';
import { spawnWorkerProcess } from './spawnWorkerProcess';
import { assignWorkToWorker, type WorkerState } from './assignWorkToWorker';
import {
  isWorkerReadyMessage,
  isWorkerProgressMessage,
  isWorkerResultMessage,
  type ProgressInfo,
} from './ipc';
import { wireStderrBadges, appendFailureLog } from './diagnostics';

/**
 * Wire up a worker's lifecycle:
 *  - on "ready": hand it work
 *  - on "progress": update per-worker progress (and optional aggregator)
 *  - on "result": update counters, clear progress, queue next work
 *  - on "exit": optionally respawn if there is still work pending
 *
 * Keep this file focused on orchestration; protocol lived in ipc.ts and
 * diagnostics (stderr badges, failure logs) live in diagnostics.ts.
 *
 * @param params - Options
 */
export function attachWorkerHandlers<T>(params: {
  /** Worker slot ID (used as key in `workers` and `workerState` maps) */
  id: number;
  /** Child process instance representing this worker */
  child: ChildProcess;
  /** Map of all active worker processes, keyed by worker ID */
  workers: Map<number, ChildProcess>;
  /** Map of UI/visual state per worker (progress, file, last log level, etc.) */
  workerState: Map<number, WorkerState>;
  /** Global counters for processed files */
  state: {
    /** Number of successfully completed files */
    completed: number;
    /** Number of failed files */
    failed: number;
  };
  /** Queue of pending file paths still to be processed */
  filesPending: string[];
  /** Function to trigger a dashboard re-render (reflects latest worker state) */
  repaint: () => void;
  /** Common task options to send with each work assignment */
  common: T;
  /** Callback fired once all workers have exited and the pool is drained */
  onAllWorkersExited: () => void;
  /** Directory path where logs and failure reports are written */
  logDir: string;
  /** Absolute path to the worker module script (used when respawning workers) */
  modulePath: string;
  /** If true, respawned workers are created with silent stdio (no inherited stdout/stderr) */
  spawnSilent?: boolean;
  /**
   * Optional aggregator callback for live throughput metrics.
   * Invoked on every progress tick from workers.
   */
  onProgress?: (info: ProgressInfo) => void;
}): void {
  const {
    id,
    child,
    workers,
    workerState,
    state,
    filesPending,
    repaint,
    common,
    onAllWorkersExited,
    logDir,
    modulePath,
    spawnSilent = false,
    onProgress,
  } = params;

  // Register worker & initialize visual state
  workers.set(id, child);
  const prev = workerState.get(id);
  workerState.set(id, {
    busy: false,
    file: null,
    startedAt: null,
    lastLevel: prev?.lastLevel ?? 'ok', // preserve previous badge (e.g., ERROR after crash)
    progress: undefined,
  });

  // Live badge updates from stderr
  wireStderrBadges(id, child, workerState, repaint);

  // IPC messages from child
  child.on('message', (msg: unknown) => {
    if (isWorkerReadyMessage(msg)) {
      assignWorkToWorker(id, common, {
        pending: filesPending,
        workers,
        workerState,
        repaint,
      });
      return;
    }

    if (isWorkerProgressMessage(msg)) {
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

      // Bubble to optional global aggregator (for throughput)
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

    if (isWorkerResultMessage(msg)) {
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
        appendFailureLog(logDir, id, filePath, error);
      }

      // Keep the worker busy until the queue is empty
      assignWorkToWorker(id, common, {
        pending: filesPending,
        workers,
        workerState,
        repaint,
      });
    }

    // Ignore unknown messages to keep parent resilient to future protocol changes
  });

  // Process exit/crash handling
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
    const abnormal = (typeof code === 'number' && code !== 0) || !!signal;
    if (abnormal && filesPending.length > 0) {
      const replacement = spawnWorkerProcess({
        id,
        modulePath,
        logDir,
        openLogWindows: true, // attempt to open tail windows for respawns too
        isSilent: spawnSilent,
      });

      attachWorkerHandlers({
        id,
        child: replacement,
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
      });
      return;
    }

    // If all workers have exited, let the parent clean up
    if (workers.size === 0) onAllWorkersExited();
  });
}
