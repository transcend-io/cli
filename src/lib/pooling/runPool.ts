/* eslint-disable max-lines */
import colors from 'colors';
import type { ChildProcess } from 'node:child_process';
import { RateCounter } from '../helpers';
import type { SlotState, FromWorker, ToWorker } from './types';
import {
  getWorkerLogPaths,
  isIpcOpen,
  safeSend,
  spawnWorkerProcess,
  type WorkerLogPaths,
} from './spawnWorkerProcess';
import { classifyLogLevel, initLogDir, makeLineSplitter } from './logRotation';
import { safeGetLogPathsForSlot } from './safeGetLogPathsForSlot';
import { installInteractiveSwitcher } from './installInteractiveSwitcher';
import type { ObjByString } from '@transcend-io/type-utils';

/**
 * Callbacks used by the generic pool orchestrator to:
 *  - fetch tasks,
 *  - format labels for UI,
 *  - fold progress and results into aggregate totals,
 *  - run optional post-processing once the pool completes.
 *
 * Each command supplies concrete `TTask`, `TProg`, `TRes`, and optionally a
 * custom totals type `TTotals`.
 */
export interface PoolHooks<
  TTask extends ObjByString,
  TProg extends ObjByString,
  TRes extends ObjByString,
  TTotals = unknown,
> {
  /**
   * Produce the next work item for a slot.
   *
   * @returns The next task or `undefined` if no tasks remain.
   */
  nextTask: () => TTask | undefined;

  /**
   * Human-readable label for a task, shown in dashboards.
   *
   * @param t - The task to label.
   * @returns A short descriptor, typically a file path or identifier.
   */
  taskLabel: (t: TTask) => string;

  /**
   * Fold an incoming progress payload into aggregate totals.
   * Should be pure (no side effects) and return the new totals object.
   *
   * @param prevTotals - The previous totals value.
   * @param prog - The latest progress payload from a worker.
   * @returns Updated totals.
   */
  onProgress: (prevTotals: TTotals, prog: TProg) => TTotals;

  /**
   * Handle a final result from a worker.
   * Should be pure and return the new totals plus a boolean indicating if the
   * unit succeeded (used to set per-slot level/metrics).
   *
   * @param prevTotals - The previous totals value.
   * @param res - The result payload from a worker.
   * @returns Object containing updated totals and success flag.
   */
  onResult: (
    prevTotals: TTotals,
    res: TRes,
  ) => {
    /** Updated totals after processing this result */
    totals: TTotals;
    /** Whether the task was successful */
    ok: boolean;
  };

  /**
   * Initialize per-slot progress state when a task is assigned.
   * Useful when you want a non-undefined `progress` immediately.
   *
   * @param t - The task to be started in this slot.
   * @returns Initial progress state or `undefined`.
   */
  initSlotProgress?: (t: TTask) => TProg | undefined;

  /**
   * Produce the initial totals value for the pool (defaults to `{}`).
   *
   * @returns A new totals object.
   */
  initTotals?: () => TTotals;

  /**
   * Provide an export status map for dashboards (optional).
   *
   * @returns A status object or `undefined` if not applicable.
   */
  exportStatus?: () => Record<string, unknown> | undefined;

  /**
   * Optional post-processing step invoked after the pool finishes.
   * Common use: writing combined logs/artifacts once all workers complete.
   *
   * When {@link RunPoolOptions.viewerMode} is enabled, the runner also passes
   * the **log directory** and the **per-slot log file paths** so you can
   * replicate the legacy “viewer mode” auto-exports (combined logs, indices, etc.).
   */
  postProcess?: (ctx: {
    /** Live snapshot of all worker slots at completion. */
    slots: Map<number, SlotState<TProg>>;
    /** Final aggregate totals. */
    totals: TTotals;
    /** Absolute path to the pool’s log directory. */
    logDir: string;
    /**
     * Mapping of slot id -> log paths (stdout/stderr/current, rotations may exist).
     * Use this to collect and export artifacts after completion.
     */
    logsBySlot: Map<number, WorkerLogPaths | undefined>;
    /** Unix millis when the pool started (first worker spawned). */
    startedAt: number;
    /** Unix millis when the pool fully completed (after last worker exit). */
    finishedAt: number;
    /**
     * Helper to safely re-fetch a slot’s current log paths, accounting for respawns.
     * Mirrors the dashboard’s attach/switcher behavior.
     */
    getLogPathsForSlot: (id: number) => WorkerLogPaths | undefined;
    /** True if the pool was run in viewerMode (non-interactive). */
    viewerMode: boolean;
  }) => Promise<void> | void;
}

/**
 * Options to run a generic worker pool.
 *
 * @template TTask  - The payload sent to each worker as a "task".
 * @template TProg  - The progress payload emitted by workers.
 * @template TRes   - The result payload emitted by workers.
 * @template TTotals - The aggregate totals object maintained by hooks.
 */
export interface RunPoolOptions<
  TTask extends ObjByString,
  TProg extends ObjByString,
  TRes extends ObjByString,
  TTotals extends ObjByString,
> {
  /** Human-readable name for the pool, shown in headers (e.g., "Parallel uploader", "Chunk CSV"). */
  title: string;

  /**
   * Directory for pool-local state (logs, discovery messages, artifacts).
   * Usually the CLI's working directory for the command.
   */
  baseDir: string;

  /** Absolute path of the module the child should execute (the command impl that calls runChild when CHILD_FLAG is present). */
  childModulePath: string;

  /**
   * Number of worker processes to spawn. Typically derived via a helper like `computePoolSize`.
   */
  poolSize: number;

  /** Logical CPU count used for display only (not required to equal `poolSize`). */
  cpuCount: number;

  /**
   * Flag that the child module expects to see in `process.argv` to run in "worker" mode.
   * This MUST match the flag the worker module checks (e.g., `--as-child`).
   */
  childFlag: string;

  /**
   * Renderer function injected by the command. The runner calls this on each "tick"
   * and on significant state changes (progress, completion, attach/detach).
   */
  render: (input: {
    /** Header/title for the UI. */
    title: string;
    /** Configured pool size (number of workers). */
    poolSize: number;
    /** CPU count for informational display. */
    cpuCount: number;
    /** Total number of files/tasks anticipated by the command. */
    filesTotal: number;
    /** Number of files/tasks that have produced a successful result so far. */
    filesCompleted: number;
    /** Number of files/tasks that have produced a failed result so far. */
    filesFailed: number;
    /**
     * Per-slot state for each worker, including busy flag, file label, start time,
     * last log level badge, and optional progress payload.
     */
    workerState: Map<number, SlotState<TProg>>;
    /**
     * Arbitrary totals object maintained by hooks. This is the primary place to surface
     * domain-specific aggregate metrics in the UI.
     */
    totals: TTotals;
    /**
     * Smoothed throughput metrics computed by the runner:
     * - successSoFar: convenience mirror of completed count for the renderer
     * - r10s: moving average of completions per second over ~10 seconds
     * - r60s: moving average of completions per second over ~60 seconds
     */
    throughput: {
      /** Convenience mirror of `filesCompleted` for renderers that expect it in this block. */
      successSoFar: number;
      /** Moving average completions/sec (10s window). */
      r10s: number;
      /** Moving average completions/sec (60s window). */
      r60s: number;
    };
    /** True when the pool has fully drained and all workers have exited. */
    final: boolean;
    /**
     * Optional export status payload surfaced by hooks; used by commands that generate
     * multiple artifact files and want to show "latest paths" in the UI.
     */
    exportStatus?: Record<string, unknown>;
  }) => void;

  /**
   * Hook suite that adapts the pool to a specific command:
   *  - nextTask(): TTask | undefined
   *  - taskLabel(task): string
   *  - initTotals?(): TTotals
   *  - initSlotProgress?(task): TProg
   *  - onProgress(totals, prog): TTotals
   *  - onResult(totals, res): { totals: TTotals; ok: boolean }
   *  - postProcess?({ slots, totals, logDir, logsBySlot, ... }): Promise<void> | void
   *  - exportStatus?(): Record<string, unknown>
   */
  hooks: PoolHooks<TTask, TProg, TRes, TTotals>;

  /**
   * Total number of "files" or logical items the command expects to process.
   * Used purely for UI/ETA; does not affect scheduling.
   */
  filesTotal: number;

  /** Open worker logs in new terminals (macOS). Default true unless viewerMode=true. */
  openLogWindows?: boolean;

  /** Silence worker stdio (except logs). */
  isSilent?: boolean;

  /**
   * When true, run in “viewer mode” (non-interactive):
   *  - Do NOT install the interactive attach/switcher.
   *  - Default `openLogWindows` to false.
   *  - Still render on a timer.
   *  - Provide `logDir`/`logsBySlot` to `postProcess` for auto-exports.
   */
  viewerMode?: boolean;

  /**
   * Optional factory for additional key bindings (e.g., log viewers/exports).
   * Only used when viewerMode === false.
   */
  extraKeyHandler?: (args: {
    /** per-slot log paths (kept up-to-date across respawns) */
    logsBySlot: Map<number, WorkerLogPaths | undefined>;
    /** re-render dashboard now */
    repaint: () => void;
    /** pause/unpause dashboard repaint while showing viewers */
    setPaused: (p: boolean) => void;
  }) => (buf: Buffer) => void;
}

/**
 * Run a multi-process worker pool for a command.
 * The runner owns: spawning workers, assigning tasks, collecting progress/results,
 * basic log badging (WARN/ERROR), an interactive attach/switcher (unless viewerMode),
 * and a render loop.
 *
 * The command injects "hooks" to customize scheduling and totals aggregation.
 *
 * @param opts - Options
 */
export async function runPool<
  TTask extends ObjByString,
  TProg extends ObjByString,
  TRes extends ObjByString,
  TTotals extends ObjByString,
>(opts: RunPoolOptions<TTask, TProg, TRes, TTotals>): Promise<void> {
  const {
    title,
    baseDir,
    poolSize,
    cpuCount,
    render,
    childModulePath,
    hooks,
    filesTotal,
    childFlag,
    viewerMode = false,
  } = opts;

  // Default behaviors may change under viewerMode.
  const openLogWindows = opts.openLogWindows ?? !viewerMode;
  const isSilent = opts.isSilent ?? true;

  const startedAt = Date.now();
  const logDir = initLogDir(baseDir);

  /** Live worker processes keyed by slot id. */
  const workers = new Map<number, ChildProcess>();
  /** Per-slot state tracked for the UI and scheduling. */
  const workerState = new Map<number, SlotState<TProg>>();
  /** File paths for each worker’s stdout/stderr logs. */
  const slotLogs = new Map<number, WorkerLogPaths | undefined>();
  /** Completion throughput meter. */ const meter = new RateCounter();
  const totalsInit = (hooks.initTotals?.() ?? {}) as TTotals;

  let totalsBox = totalsInit;
  let activeWorkers = 0;
  let completed = 0;
  let failed = 0;

  // Repaint ticker starts on first READY to avoid double-first-render.
  let ticker: NodeJS.Timeout | null = null;
  let firstReady = false;
  // Gate repaint during popup viewers/exports (driven by extraKeyHandler).
  let paused = false;
  // Keep a reference so we can unbind on exit.
  let extraHandler: ((buf: Buffer) => void) | null = null;

  /**
   * Paint the UI. The renderer is intentionally pure and receives
   * a snapshot of current state.
   *
   * @param final - If true, render the final state and exit.
   */
  const repaint = (final = false): void => {
    if (paused) return;
    render({
      title,
      poolSize,
      cpuCount,
      filesTotal,
      filesCompleted: completed,
      filesFailed: failed,
      workerState,
      totals: totalsBox,
      final,
      exportStatus: hooks.exportStatus?.(),
      throughput: {
        successSoFar: completed,
        r10s: meter.rate(10_000),
        r60s: meter.rate(60_000),
      },
    });
  };

  /**
   * Assign the next task to `id` if available.
   *
   * @param id - The worker slot id to assign a task to.
   * @returns true if a task was assigned.
   *
   * NOTE: This is the critical fix. We **do not** "peek & put back" a task.
   * We only consume via `nextTask()` inside this function.
   */
  const assign = (id: number): boolean => {
    const task = hooks.nextTask();
    if (!task) return false;

    const child = workers.get(id)!;
    const label = hooks.taskLabel(task);
    const initialProg = hooks.initSlotProgress?.(task);

    workerState.set(id, {
      busy: true,
      file: label,
      startedAt: Date.now(),
      lastLevel: 'ok',
      progress: initialProg,
    });

    safeSend(child, { type: 'task', payload: task } as ToWorker<TTask>);
    repaint();
    return true;
  };

  /* Spawn workers */
  for (let i = 0; i < poolSize; i += 1) {
    const child = spawnWorkerProcess({
      id: i,
      modulePath: childModulePath,
      logDir,
      openLogWindows,
      isSilent,
      childFlag,
    });
    workers.set(i, child);
    workerState.set(i, {
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'ok',
    });
    slotLogs.set(i, getWorkerLogPaths(child));
    activeWorkers += 1;

    // badge WARN/ERROR quickly from stderr
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

    // messages from the worker
    // eslint-disable-next-line no-loop-func
    child.on('message', (msg: FromWorker<TProg, TRes>) => {
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'ready') {
        if (!firstReady) {
          firstReady = true;
          ticker = setInterval(() => repaint(false), 350);
        }
        assign(i); // try to start work immediately
        return;
      }

      if (msg.type === 'progress') {
        totalsBox = hooks.onProgress(totalsBox, msg.payload);
        const prev = workerState.get(i)!;
        workerState.set(i, { ...prev, progress: msg.payload });
        repaint();
        return;
      }

      if (msg.type === 'result') {
        const prev = workerState.get(i)!;
        const { totals: t2, ok } = hooks.onResult(totalsBox, msg.payload);
        totalsBox = t2;

        if (ok) {
          completed += 1;
          meter.add(1);
        } else {
          failed += 1;
        }

        workerState.set(i, {
          ...prev,
          busy: false,
          file: null,
          progress: undefined,
          lastLevel: ok ? 'ok' : 'error',
        });

        // Just try to assign; if none left, shut this child down.
        if (!assign(i) && isIpcOpen(child)) {
          safeSend(child, { type: 'shutdown' } as ToWorker<TTask>);
        }
        repaint();
      }
    });

    // eslint-disable-next-line no-loop-func
    child.on('exit', () => {
      activeWorkers -= 1;
      if (activeWorkers === 0) {
        if (ticker) clearInterval(ticker);
        repaint(true);
      }
    });
  }

  /* Interactive attach/switcher */
  let cleanupSwitcher: () => void = () => {
    /* noop */
    // no-op by default, overridden in non-viewerMode
  };

  const tearDownStdin = (): void => {
    try {
      process.stdin.setRawMode?.(false);
    } catch {
      /* noop */
    }
    try {
      process.stdin.pause();
    } catch {
      /* noop */
    }
  };

  const onSigint = (): void => {
    if (ticker) clearInterval(ticker);
    cleanupSwitcher?.();
    if (extraHandler) {
      try {
        process.stdin.off('data', extraHandler);
      } catch {
        /* noop */
      }
    }
    tearDownStdin();

    process.stdout.write('\nStopping workers...\n');
    for (const [, w] of workers) {
      if (isIpcOpen(w)) safeSend(w, { type: 'shutdown' } as ToWorker<TTask>);
      try {
        w?.kill('SIGTERM');
      } catch {
        /* noop */
      }
    }
    process.exit(130);
  };

  const onAttach = (id: number): void => {
    paused = true; // stop dashboard repaint while attached/viewing
    process.stdout.write('\x1b[2J\x1b[H'); // clear + home
    process.stdout.write(
      `Attached to worker ${id}. (Esc/Ctrl+] detach • Ctrl+D EOF • Ctrl+C SIGINT)\n`,
    );
  };
  const onDetach = (): void => {
    paused = false;
    repaint();
  };

  process.once('SIGINT', onSigint);

  if (!viewerMode) {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(true);
      } catch {
        process.stdout.write(
          colors.yellow(
            'Warning: Unable to enable raw mode for interactive key handling.\n',
          ),
        );
      }
      process.stdin.resume(); // keep stdin flowing (no encoding — raw Buffer)
    }

    cleanupSwitcher = installInteractiveSwitcher({
      workers,
      onAttach,
      onDetach,
      onCtrlC: onSigint,
      getLogPaths: (id) => safeGetLogPathsForSlot(id, workers, slotLogs),
      replayBytes: 200 * 1024,
      replayWhich: ['out', 'err'],
      onEnterAttachScreen: onAttach,
    });

    if (opts.extraKeyHandler) {
      extraHandler = opts.extraKeyHandler({
        logsBySlot: slotLogs,
        repaint: () => repaint(),
        setPaused: (p) => {
          paused = p;
        },
      });
      process.stdin.on('data', extraHandler);
    }
  }

  /* Wait for full completion, then post-process (with log context if needed). */
  await new Promise<void>((resolve) => {
    const check = setInterval(async () => {
      if (activeWorkers === 0) {
        clearInterval(check);
        if (ticker) clearInterval(ticker);
        cleanupSwitcher();

        if (extraHandler) {
          try {
            process.stdin.off('data', extraHandler);
          } catch {
            /* noop */
          }
        }
        tearDownStdin();

        const finishedAt = Date.now();

        try {
          await hooks.postProcess?.({
            slots: workerState,
            totals: totalsBox,
            logDir,
            logsBySlot: slotLogs,
            startedAt,
            finishedAt,
            viewerMode,
            getLogPathsForSlot: (id: number) =>
              safeGetLogPathsForSlot(id, workers, slotLogs),
          });
        } catch (err: unknown) {
          const msg =
            (
              err as {
                /** Error stack */
                stack?: string;
              }
            )?.stack ?? String(err);
          process.stdout.write(colors.red(`postProcess error: ${msg}\n`));
        }
        resolve();
      }
    }, 300);
  });
}
/* eslint-enable max-lines */
