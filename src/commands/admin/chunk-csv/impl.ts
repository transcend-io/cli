import type { LocalContext } from '../../../context';
import colors from 'colors';
import { logger } from '../../../logger';
import type { ChildProcess } from 'node:child_process';

import {
  computePoolSize,
  getWorkerLogPaths,
  isIpcOpen,
  safeSend,
  spawnWorkerProcess,
  classifyLogLevel,
  makeLineSplitter,
  initLogDir,
  CHILD_FLAG,
} from '../../../lib/pooling';
import { getCurrentModulePath, RateCounter } from '../../../lib/helpers';
import { renderDashboard } from './ui/renderDashboard';
import { runChild } from './worker';
import { collectCsvFilesOrExit } from '../../../lib/helpers/collectCsvFilesOrExit';

/**
 * Command-line flags supported by `chunkCsvParent`.
 */
export type ChunkCsvCommandFlags = {
  /** Input directory containing CSV files to be chunked */
  directory: string;
  /** Directory where chunked CSV files will be written (defaults to CWD if not set) */
  outputDir?: string;
  /** Whether to clear the output directory before writing new chunks */
  clearOutputDir: boolean;
  /** Target chunk size in MB (approximate) */
  chunkSizeMB: number;
  /** Optional concurrency override (defaults to pool-size heuristic) */
  concurrency?: number;
};

/** Per-worker progress (rows processed out of total rows, if known). */
type WorkerProgress = {
  processed: number;
  total?: number;
};

/** Lightweight state tracked for each worker process. */
type WorkerState = {
  /** Whether the worker is currently busy with a task */
  busy: boolean;
  /** The file currently being processed, or null if idle */
  file: string | null;
  /** Last observed log severity from this worker */
  lastLevel: 'ok' | 'warn' | 'error';
  /** Progress stats, if reported */
  progress?: WorkerProgress;
};

/** Messages received from child processes */
type ReadyMsg = { type: 'ready' };
type ProgressMsg = {
  type: 'progress';
  payload: { filePath: string; processed: number; total?: number };
};
type ResultMsg = {
  type: 'result';
  payload: { ok: boolean; filePath: string; error?: string };
};
type ParentInbound = ReadyMsg | ProgressMsg | ResultMsg;

/**
 * Parent entrypoint for the "chunk-csv" command.
 *
 * - Collects input CSV files.
 * - Spawns a pool of worker processes to handle them concurrently.
 * - Tracks per-worker state, progress, and errors.
 * - Periodically re-renders a TTY dashboard until all work completes.
 *
 * @param this - Execution context (includes logger, config, etc.)
 * @param flags - Command-line flags controlling chunking behavior
 */
export async function chunkCsvParent(
  this: LocalContext,
  flags: ChunkCsvCommandFlags,
): Promise<void> {
  const { directory, outputDir, clearOutputDir, chunkSizeMB, concurrency } =
    flags;

  // Gather CSV files from the input directory or exit if none found
  const files = collectCsvFilesOrExit(directory, this);

  // Determine pool size and CPU availability
  const { poolSize, cpuCount } = computePoolSize(concurrency, files.length);

  logger.info(
    colors.green(
      `Chunking ${files.length} CSV file(s) with pool size ${poolSize} (CPU=${cpuCount})`,
    ),
  );

  // --- Shared counters and global state ---
  const workers = new Map<number, ChildProcess>();
  const workerState = new Map<number, WorkerState>();
  const slotLogs = new Map<number, ReturnType<typeof getWorkerLogPaths>>();
  const pending = [...files];
  const totals = { completed: 0, failed: 0 };
  let activeWorkers = 0;

  // Track global throughput (rows/sec across all workers)
  const meter = new RateCounter();

  /**
   * Refresh the dashboard view in the terminal.
   *
   * @param final - When true, finalizes the view (shows cursor again).
   */
  const repaint = (final = false): void => {
    renderDashboard({
      poolSize,
      cpuCount,
      filesTotal: files.length,
      filesCompleted: totals.completed,
      filesFailed: totals.failed,
      workerState,
      final,
      throughput: {
        successSoFar: 0, // success counting not wired here
        r10s: meter.rate(10_000),
        r60s: meter.rate(60_000),
      },
      exportsDir: directory || outputDir || process.cwd(),
      exportStatus: {}, // not used in this command
    });
  };

  /**
   * Assign the next pending file to a given worker.
   *
   * @param id - Worker ID
   */
  const assign = (id: number): void => {
    if (pending.length === 0) return;
    const filePath = pending.shift();
    if (!filePath) return;

    const w = workers.get(id)!;
    workerState.set(id, {
      busy: true,
      file: filePath,
      lastLevel: 'ok',
      progress: { processed: 0, total: undefined },
    });

    safeSend(w, {
      type: 'task',
      payload: {
        filePath,
        options: { outputDir, clearOutputDir, chunkSizeMB },
      },
    });

    repaint();
  };

  // --- Spawn worker pool ---
  const logDir = initLogDir(directory || outputDir || process.cwd());
  const modulePath = getCurrentModulePath();

  for (let i = 0; i < poolSize; i += 1) {
    const child = spawnWorkerProcess({
      id: i,
      modulePath,
      logDir,
      openLogWindows: false,
      isSilent: true,
    });

    workers.set(i, child);
    workerState.set(i, {
      busy: false,
      file: null,
      lastLevel: 'ok',
      progress: undefined,
    });
    slotLogs.set(i, getWorkerLogPaths(child));
    activeWorkers += 1;

    // Classify stderr lines into warn/error for dashboard badges
    const errLine = makeLineSplitter((line) => {
      const lvl = classifyLogLevel(line);
      if (!lvl) return;
      const prev = workerState.get(i)!;
      if (prev.lastLevel !== lvl) {
        workerState.set(i, { ...prev, lastLevel: lvl });
        repaint();
      }
    });
    child.stderr?.on('data', errLine);

    // Handle structured messages from the child process
    child.on('message', (msg: ParentInbound) => {
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'ready') {
        assign(i);
        repaint();
        return;
      }

      if (msg.type === 'progress') {
        const { filePath, processed, total } = msg.payload || {};
        const prev = workerState.get(i)!;
        workerState.set(i, {
          ...prev,
          file: prev.file ?? filePath ?? prev.file,
          progress: { processed, total },
        });
        repaint();
        return;
      }

      if (msg.type === 'result') {
        const { ok } = msg.payload || {};
        if (ok) totals.completed += 1;
        else totals.failed += 1;

        const prev = workerState.get(i)!;
        workerState.set(i, {
          ...prev,
          busy: false,
          file: null,
          progress: undefined,
          lastLevel: ok ? 'ok' : 'error',
        });

        if (pending.length > 0) assign(i);
        else if (!pending.length) {
          if (isIpcOpen(child)) safeSend(child, { type: 'shutdown' });
        }
        repaint();
      }
    });

    // Handle worker exit
    // eslint-disable-next-line no-loop-func
    child.on('exit', () => {
      activeWorkers -= 1;
      if (activeWorkers === 0) {
        repaint(true);
      }
    });
  }

  // Periodic repaint while work is ongoing
  const tick = setInterval(() => repaint(false), 350);

  // Resolve once all files are processed and all workers have exited
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (pending.length === 0 && activeWorkers === 0) {
        clearInterval(check);
        clearInterval(tick);
        repaint(true);
        resolve();
      }
    }, 300);
  });
}

/* -------------------------------------------------------------------------------------------------
 * Child entrypoint:
 * If process was invoked with CHILD_FLAG, run worker loop instead of parent.
 * ------------------------------------------------------------------------------------------------- */
if (process.argv.includes(CHILD_FLAG)) {
  runChild().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}
