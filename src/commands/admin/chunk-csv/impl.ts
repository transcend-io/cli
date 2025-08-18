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
  installInteractiveSwitcher,
} from '../../../lib/pooling';
import { getCurrentModulePath, RateCounter } from '../../../lib/helpers';
import { renderDashboard } from './ui/renderDashboard';
import { runChild } from './worker';
import { collectCsvFilesOrExit } from '../../../lib/helpers/collectCsvFilesOrExit';

/**
 * CLI flags accepted by the chunk-csv command.
 *
 * Most flags are passed down to workers as part of each task payload.
 */
export type ChunkCsvCommandFlags = {
  /** Directory containing input CSVs to chunk (required). */
  directory: string;
  /** Optional output directory for chunked files (defaults near the input). */
  outputDir?: string;
  /** Remove any previous chunk files for a CSV before writing new ones. */
  clearOutputDir: boolean;
  /** Approximate chunk size threshold in MB (e.g., 10). */
  chunkSizeMB: number;
  /** Optional override for parallelism; if omitted, use a CPU-based heuristic. */
  concurrency?: number;
};

/** Per-worker progress snapshot. */
type WorkerProgress = {
  /** Rows processed so far for the current file. */
  processed: number;
  /** Total rows (if known). Not all workers will report a total. */
  total?: number;
};

/** Minimal state we track for each live worker. */
type WorkerState = {
  /** Whether the worker is actively processing a file (vs. idle/waiting). */
  busy: boolean;
  /** Which file the worker is assigned (null when idle). */
  file: string | null;
  /** Last “level” seen in its stderr (ok/warn/error) for dashboard badges. */
  lastLevel: 'ok' | 'warn' | 'error';
  /** Streaming progress info (rows processed / total if available). */
  progress?: WorkerProgress;
};

/** Child → Parent messages we handle. */
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

/* ================================================================================================
 * Small utilities
 * ============================================================================================== */

/**
 * Coalesce multiple fast “repaint” calls into a single render in the same tick.
 * This prevents “double draw at startup” and other quick successions of redraws.
 *
 * @param fn - Function to call with final=true when the repaint is flushed.
 * @returns A function that can be called with final=false to queue a repaint.
 */
function createRepaintScheduler(
  fn: (final?: boolean) => void,
): (final?: boolean) => void {
  // Use a closure to track the state of the repaint queue
  let queued = false;
  let lastFinal = false;
  return (final = false): void => {
    // If any queued request is “final”, we propagate final=true once we flush.
    lastFinal = lastFinal || final;
    if (queued) return;
    queued = true;
    setImmediate(() => {
      queued = false;
      fn(lastFinal);
      lastFinal = false;
    });
  };
}

/**
 * Parent entrypoint for chunking many CSVs in parallel using a worker pool.
 *
 * Lifecycle:
 *  1) Discover CSV inputs (exit if none).
 *  2) Compute pool size (CPU-count heuristic or --concurrency).
 *  3) Spawn workers and wire up IPC/STDERR listeners.
 *  4) Assign work from a pending queue; track progress in `workerState`.
 *  5) Render a flicker-free dashboard (periodic + on events).
 *  6) Provide an interactive switcher (digits 0–9 to attach, etc.).
 *  7) Gracefully shutdown once the queue is empty and all workers exit.
 *
 * @param this  - Bound CLI context (for process.exit and logging).
 * @param flags - CLI options for the run.
 */
export async function chunkCsvParent(
  this: LocalContext,
  flags: ChunkCsvCommandFlags,
): Promise<void> {
  const { directory, outputDir, clearOutputDir, chunkSizeMB, concurrency } =
    flags;

  /* 1) Discover inputs */
  const files = collectCsvFilesOrExit(directory, this);

  /* 2) Size the pool */
  const { poolSize, cpuCount } = computePoolSize(concurrency, files.length);

  logger.info(
    colors.green(
      `Chunking ${files.length} CSV file(s) with pool size ${poolSize} (CPU=${cpuCount})`,
    ),
  );

  /* 3) Global state for this run */
  const workers = new Map<number, ChildProcess>();
  const workerState = new Map<number, WorkerState>();
  const slotLogs = new Map<number, ReturnType<typeof getWorkerLogPaths>>();
  const pending = [...files];
  const totals = { completed: 0, failed: 0 };
  let activeWorkers = 0;

  // Optional throughput meter (rows/s) if you want to aggregate across workers.
  const meter = new RateCounter();

  /**
   * Render the dashboard. Note: `renderDashboard` itself deduplicates frames,
   * but we also coalesce call sites (see `repaint` below) to avoid bursty double draws.
   *
   * @param final - Whether this is the final frame (e.g., on shutdown).
   */
  const doRender = (final = false): void => {
    renderDashboard({
      poolSize,
      cpuCount,
      filesTotal: files.length,
      filesCompleted: totals.completed,
      filesFailed: totals.failed,
      workerState,
      final,
      throughput: {
        successSoFar: 0, // Cumulated “success” not tracked here; easy to add if needed.
        r10s: meter.rate(10_000),
        r60s: meter.rate(60_000),
      },
      exportsDir: directory || outputDir || process.cwd(),
      exportStatus: {},
    });
  };

  // Combine multiple doRender() triggers in the same tick into a single repaint.
  const repaint = createRepaintScheduler(doRender);

  /**
   * Assign the next file in the queue to a given worker slot.
   * Updates dashboard state and sends a task message over IPC.
   *
   * @param id - Worker ID to assign the next file to.
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
      progress: { processed: 0 },
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

  /* 4) Spawn workers + attach listeners */
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
    workerState.set(i, { busy: false, file: null, lastLevel: 'ok' });
    slotLogs.set(i, getWorkerLogPaths(child));
    activeWorkers += 1;

    // Classify each stderr line into ok/warn/error to badge the worker row.
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

    // Core IPC we expect from the worker lifecycle.
    child.on('message', (msg: ParentInbound) => {
      if (!msg || typeof msg !== 'object') return;

      // Worker is ready to accept work.
      if (msg.type === 'ready') {
        assign(i);
        repaint();
        return;
      }

      // Streaming progress (per row chunk, etc).
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

      // File completed (ok / failed). We move on to the next file or shut down.
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
        else if (isIpcOpen(child)) safeSend(child, { type: 'shutdown' });

        repaint();
      }
    });

    // Keep `activeWorkers` in sync; when it reaches zero and there’s no
    // pending work, we can finalize the dashboard and exit.
    // eslint-disable-next-line no-loop-func
    child.on('exit', () => {
      activeWorkers -= 1;
      if (activeWorkers === 0) repaint(true);
    });
  }

  /* 5) Interactive attach/switcher setup (digits 0–9, Tab cycle, Esc detach, etc.) */

  // Periodic repaint handle (cleared on shutdown).
  let tick: NodeJS.Timeout | undefined;

  /**
   * Dashboard-level Ctrl+C handling:
   *  - If in dashboard mode: gracefully stop all workers and exit 130.
   *    (The switcher will forward Ctrl+C to this handler.)
   *  - If in attached mode: the switcher sends SIGINT to the focused child,
   *    then detaches back to the dashboard.
   */
  const onSigint = (): void => {
    if (tick) clearInterval(tick);
    cleanupSwitcher?.();

    process.stdout.write('\nStopping workers...\n');
    for (const [, w] of workers) {
      if (isIpcOpen(w)) safeSend(w, { type: 'shutdown' });
      try {
        w?.kill('SIGTERM');
      } catch {
        // Best-effort; process may already be gone.
      }
    }
    this.process.exit(130);
  };
  process.once('SIGINT', onSigint);

  /** When detaching from a child, clear and immediately repaint the dashboard. */
  const onDetachScreen = (): void => {
    process.stdout.write('\x1b[2J\x1b[H');
    repaint();
  };

  /**
   * When attaching to a child, clear and show a small banner.
   *
   * @param id - Worker ID to attach to.
   */
  const onAttachScreen = (id: number): void => {
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write(
      `Attached to worker ${id}. (Esc/Ctrl+] detach • Ctrl+C SIGINT • Ctrl+D EOF)\n`,
    );
  };

  // Register the key-driven interactive switcher (0–9 attach, Tab cycle, etc).
  let cleanupSwitcher: () => void = () => {
    // No-op by default; will be set by installInteractiveSwitcher below.
  };
  cleanupSwitcher = installInteractiveSwitcher({
    workers,
    onAttach: onAttachScreen,
    onDetach: onDetachScreen,
    onCtrlC: onSigint,
    getLogPaths: (id) => slotLogs.get(id),
    replayBytes: 200 * 1024, // Tail ~200KB on attach so you see recent history
    replayWhich: ['out', 'err'], // Replay stdout then stderr
    onEnterAttachScreen: onAttachScreen,
  });

  /* 6) Initial paint + periodic refresh (coalesced with on-event repaints) */
  repaint(false); // single initial frame (prevents “double frame” burst)
  tick = setInterval(() => repaint(false), 350);

  /* 7) Wait for completion: queue empty + all workers exited */
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (pending.length === 0 && activeWorkers === 0) {
        clearInterval(check);
        if (tick) clearInterval(tick);
        repaint(true); // render final frame (restores cursor)
        cleanupSwitcher(); // remove key handlers/TTY muting
        resolve();
      }
    }, 300);
  });
}

/* -------------------------------------------------------------------------------------------------
 * If invoked directly as a child process, enter worker loop
 * ------------------------------------------------------------------------------------------------- */
if (process.argv.includes(CHILD_FLAG)) {
  runChild().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}
