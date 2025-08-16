// impl.ts
import type { LocalContext } from '../../../context';
import colors from 'colors';
import { logger } from '../../../logger';
import { join } from 'node:path';
import {
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';

import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import {
  computeReceiptsFolder,
  computeSchemaFile,
  getFilePrefix,
} from './computeFiles';
import { collectCsvFilesOrExit } from './collectCsvFilesOrExit';

import { availableParallelism } from 'node:os';
import type { ChildProcess } from 'node:child_process';

import { runChild } from './runChild';
import {
  getWorkerLogPaths,
  renderDashboard,
  spawnWorkerProcess,
  type WorkerState,
} from '../../../lib/pooling';
import { installInteractiveSwitcher } from '../../../lib/pooling/installInteractiveSwitcher';
import { resetWorkerLogs } from '../../../lib/pooling/logRotation';

/** CLI flags */
export interface UploadPreferencesCommandFlags {
  auth: string;
  partition: string;
  sombraAuth?: string;
  transcendUrl: string;
  file?: string;
  directory?: string;
  dryRun: boolean;
  skipExistingRecordCheck: boolean;
  receiptFileDir?: string;
  schemaFilePath?: string;
  skipWorkflowTriggers: boolean;
  forceTriggerWorkflows: boolean;
  skipConflictUpdates: boolean;
  isSilent: boolean;
  attributes: string;
  receiptFilepath: string;
  concurrency?: number;
  allowedIdentifierNames: string[];
  identifierColumns: string[];
  columnsToIgnore?: string[];
}

/** Common options shared by upload tasks */
export type TaskCommonOpts = Pick<
  UploadPreferencesCommandFlags,
  | 'auth'
  | 'partition'
  | 'sombraAuth'
  | 'directory'
  | 'transcendUrl'
  | 'skipConflictUpdates'
  | 'skipWorkflowTriggers'
  | 'skipExistingRecordCheck'
  | 'isSilent'
  | 'dryRun'
  | 'attributes'
  | 'forceTriggerWorkflows'
  | 'allowedIdentifierNames'
  | 'identifierColumns'
  | 'columnsToIgnore'
> & {
  schemaFile: string;
  receiptsFolder: string;
};

function getCurrentModulePath(): string {
  // @ts-ignore - __filename exists in CJS/ts-node
  if (typeof __filename !== 'undefined') return __filename as unknown as string;
  return process.argv[1];
}

function computePoolSize(
  concurrency: number | undefined,
  filesCount: number,
): { poolSize: number; cpuCount: number } {
  const cpuCount = Math.max(1, availableParallelism?.() ?? 1);
  const desired =
    typeof concurrency === 'number' && concurrency > 0
      ? Math.min(concurrency, filesCount)
      : Math.min(cpuCount, filesCount);
  return { poolSize: desired, cpuCount };
}

/** IPC helpers ------------------------------------------------------------ */

function isIpcOpen(w: ChildProcess | undefined | null): boolean {
  // @ts-ignore - channel is internal but exists for forked children
  const ch = w && (w as any).channel;
  // @ts-ignore
  return !!(w && w.connected && ch && !ch.destroyed);
}

function safeSend(w: ChildProcess, msg: unknown): boolean {
  if (!isIpcOpen(w)) return false;
  try {
    w.send?.(msg as any);
    return true;
  } catch (err: any) {
    if (
      err?.code === 'ERR_IPC_CHANNEL_CLOSED' ||
      err?.code === 'EPIPE' ||
      err?.errno === -32
    ) {
      return false;
    }
    throw err;
  }
}

/** Receipt helpers -------------------------------------------------------- */

/**
 * Find the receipt JSON for a given input file (supports suffixes like __1).
 *
 * @param receiptsFolder
 * @param filePath
 */
function resolveReceiptPath(
  receiptsFolder: string,
  filePath: string,
): string | null {
  const base = `${getFilePrefix(filePath)}-receipts.json`;
  const exact = join(receiptsFolder, base);
  if (existsSync(exact)) return exact;

  const prefix = `${getFilePrefix(filePath)}-receipts`;
  try {
    const entries = readdirSync(receiptsFolder)
      .filter((n) => n.startsWith(prefix) && n.endsWith('.json'))
      .map((name) => {
        const full = join(receiptsFolder, name);
        let mtime = 0;
        try {
          mtime = statSync(full).mtimeMs;
        } catch {}
        return { full, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    return entries[0]?.full ?? null;
  } catch {
    return null;
  }
}

/** Totals union types for renderer */
type UploadModeTotals = {
  mode: 'upload';
  success: number;
  skipped: number;
  error: number;
  errors: Record<string, number>;
};
type CheckModeTotals = {
  mode: 'check';
  totalPending: number;
  pendingConflicts: number;
  pendingSafe: number;
  skipped: number;
};
type AnyTotals = UploadModeTotals | CheckModeTotals;

/**
 * Summarize receipt (skipped counted in both modes).
 *
 * @param receiptPath
 * @param dryRun
 */
function summarizeReceipt(receiptPath: string, dryRun: boolean): AnyTotals {
  try {
    const raw = readFileSync(receiptPath, 'utf8');
    const json = JSON.parse(raw) as any;

    const skippedCount = Object.values(
      json?.skippedUpdated ?? json?.skippedUpdates ?? {},
    ).length;

    if (!dryRun) {
      const success = Object.values(json?.successfulUpdates ?? {}).length;
      const failed = Object.values(json?.failingUpdates ?? {}).length;
      const errors: Record<string, number> = {};
      Object.values(json?.failingUpdates ?? {}).forEach((v) => {
        const msg = (v as any)?.error ?? 'Unknown error';
        errors[msg] = (errors[msg] ?? 0) + 1;
      });
      return {
        mode: 'upload',
        success,
        skipped: skippedCount,
        error: failed,
        errors,
      };
    }

    const totalPending = Object.values(json?.pendingUpdates ?? {}).length;
    const pendingConflicts = Object.values(
      json?.pendingConflictUpdates ?? {},
    ).length;
    const pendingSafe = Object.values(json?.pendingSafeUpdates ?? {}).length;

    return {
      mode: 'check',
      totalPending,
      pendingConflicts,
      pendingSafe,
      skipped: skippedCount,
    };
  } catch {
    return !dryRun
      ? { mode: 'upload', success: 0, skipped: 0, error: 0, errors: {} }
      : {
          mode: 'check',
          totalPending: 0,
          pendingConflicts: 0,
          pendingSafe: 0,
          skipped: 0,
        };
  }
}

/** stderr → ERROR/WARN indicator helpers ---------------------------------- */

// --- helpers to parse stderr lines and classify warn/error ---
function makeLineSplitter(onLine: (line: string) => void) {
  let buf = '';
  return (chunk: Buffer | string) => {
    buf += chunk.toString('utf8');
    let nl: number;
    // eslint-disable-next-line no-cond-assign
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl);
      onLine(line);
      buf = buf.slice(nl + 1);
    }
  };
}

/**
 * Return 'warn' | 'error' when the line is an *explicit* tagged message we care about.
 * Otherwise return null so the dashboard ignores it.
 *
 * @param line
 */
function classifyLevel(line: string): 'warn' | 'error' | null {
  // strip ANSI (very light pass; good enough for our tags)
  const noAnsi = line.replace(/\x1B\[[0-9;]*m/g, '');
  // look for our child prefixes: "[wN] ERROR ..." or "[wN] WARN ..."
  const m =
    /^\s*\[w\d+\]\s+(ERROR|WARN|uncaughtException|unhandledRejection)\b/i.exec(
      noAnsi,
    );
  if (!m) return null;
  const tag = m[1].toLowerCase();
  if (tag === 'warn') return 'warn';
  return 'error'; // ERROR, uncaughtException, unhandledRejection → error
}
/** Main ------------------------------------------------------------------- */

export async function uploadPreferences(
  this: LocalContext,
  {
    auth,
    partition,
    sombraAuth,
    transcendUrl,
    file = '',
    directory,
    dryRun,
    skipExistingRecordCheck,
    receiptFileDir,
    schemaFilePath,
    skipWorkflowTriggers,
    forceTriggerWorkflows,
    skipConflictUpdates,
    isSilent,
    attributes,
    concurrency,
    allowedIdentifierNames,
    identifierColumns,
    columnsToIgnore = [],
  }: UploadPreferencesCommandFlags,
): Promise<void> {
  const files = collectCsvFilesOrExit(directory, file, this);
  doneInputValidation(this.process.exit);

  logger.info(
    colors.green(
      `Processing ${files.length} consent preferences files for partition: ${partition}`,
    ),
  );
  logger.debug(`Files to process:\n${files.join('\n')}`);

  if (skipExistingRecordCheck) {
    logger.info(
      colors.bgYellow(
        `Skipping existing record check: ${skipExistingRecordCheck}`,
      ),
    );
  }

  const receiptsFolder = computeReceiptsFolder(receiptFileDir, directory);
  const schemaFile = computeSchemaFile(schemaFilePath, directory, files[0]);

  const { poolSize, cpuCount } = computePoolSize(concurrency, files.length);
  const common: TaskCommonOpts = {
    schemaFile,
    receiptsFolder,
    auth,
    directory,
    sombraAuth,
    partition,
    transcendUrl,
    skipConflictUpdates,
    skipWorkflowTriggers,
    skipExistingRecordCheck,
    isSilent,
    dryRun,
    attributes,
    forceTriggerWorkflows,
    allowedIdentifierNames,
    identifierColumns,
    columnsToIgnore,
  };

  // ---- Worker pool lifecycle ----
  const LOG_DIR = join(directory || receiptsFolder, 'logs');
  mkdirSync(LOG_DIR, { recursive: true });

  const RESET_MODE =
    (process.env.RESET_LOGS as 'truncate' | 'delete') ?? 'truncate';
  resetWorkerLogs(LOG_DIR, RESET_MODE);

  const modulePath = getCurrentModulePath();

  const workers = new Map<number, ChildProcess>();
  const workerState = new Map<number, WorkerState>();
  const slotLogPaths = new Map<
    number,
    ReturnType<typeof getWorkerLogPaths> | undefined
  >();
  const pending = [...files];
  const totals = { completed: 0, failed: 0 };
  let activeWorkers = 0;

  const agg: AnyTotals = !common.dryRun
    ? { mode: 'upload', success: 0, skipped: 0, error: 0, errors: {} }
    : {
        mode: 'check',
        totalPending: 0,
        pendingConflicts: 0,
        pendingSafe: 0,
        skipped: 0,
      };

  let dashboardPaused = false;
  const repaint = (final = false) => {
    if (dashboardPaused && !final) return;
    renderDashboard(
      poolSize,
      cpuCount,
      files.length,
      totals.completed,
      totals.failed,
      workerState,
      agg,
      { final },
    );
  };

  const assignWorkToWorker = (id: number) => {
    const w = workers.get(id);
    if (!isIpcOpen(w)) {
      workerState.set(id, {
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: 'ok' as any,
      });
      return;
    }
    const filePath = pending.shift();
    if (!filePath) {
      const prev = workerState.get(id) || ({} as WorkerState);
      workerState.set(id, {
        ...prev,
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: 'ok' as any,
      });
      return;
    }
    workerState.set(id, {
      busy: true,
      file: filePath,
      startedAt: Date.now(),
      lastLevel: 'ok' as any,
    });
    if (
      !safeSend(w!, { type: 'task', payload: { filePath, options: common } })
    ) {
      // IPC closed between check and send; requeue and mark idle
      pending.unshift(filePath);
      workerState.set(id, {
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: 'ok' as any,
      });
    }
  };

  const refillIdleWorkers = () => {
    for (const [id] of workers) {
      const st = workerState.get(id);
      if (!st || !st.busy) {
        if (pending.length === 0) break;
        assignWorkToWorker(id);
      }
    }
  };

  // Spawn the pool
  for (let i = 0; i < poolSize; i += 1) {
    const child = spawnWorkerProcess(i, modulePath, LOG_DIR, true, isSilent);
    workers.set(i, child);
    workerState.set(i, {
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'ok' as any,
    });
    slotLogPaths.set(i, getWorkerLogPaths(child));
    activeWorkers += 1;

    // Surface WARN/ERROR status live from stderr
    const errLine = makeLineSplitter((line) => {
      const lvl = classifyLevel(line);
      if (!lvl) return; // ignore untagged stderr noise
      const prev = workerState.get(i) || ({} as WorkerState);
      if (prev.lastLevel !== lvl) {
        workerState.set(i, { ...prev, lastLevel: lvl });
        repaint();
      }
    });
    child.stderr?.on('data', errLine);

    child.on('error', (err: any) => {
      if (
        err?.code === 'ERR_IPC_CHANNEL_CLOSED' ||
        err?.code === 'EPIPE' ||
        err?.errno === -32
      ) {
        return; // benign during shutdown/restarts
      }
      logger.error(colors.red(`Worker ${i} error: ${err?.stack || err}`));
    });

    child.on('message', (msg: any) => {
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'ready') {
        refillIdleWorkers();
        repaint();
        return;
      }

      if (msg.type === 'result') {
        const { ok, filePath, receiptFilepath } = msg.payload || {};
        if (ok) totals.completed += 1;
        else totals.failed += 1;

        const resolved =
          (typeof receiptFilepath === 'string' && receiptFilepath) ||
          resolveReceiptPath(common.receiptsFolder, filePath);
        if (resolved) {
          const summary = summarizeReceipt(resolved, common.dryRun);
          if (summary.mode === 'upload' && agg.mode === 'upload') {
            agg.success += summary.success;
            agg.skipped += summary.skipped;
            agg.error += summary.error;
            Object.entries(summary.errors).forEach(([k, v]) => {
              (agg.errors as Record<string, number>)[k] =
                (agg.errors[k] ?? 0) + (v as number);
            });
          } else if (summary.mode === 'check' && agg.mode === 'check') {
            agg.totalPending += summary.totalPending;
            agg.pendingConflicts += summary.pendingConflicts;
            agg.pendingSafe += summary.pendingSafe;
            agg.skipped += summary.skipped;
          }
        }

        workerState.set(i, {
          busy: false,
          file: null,
          startedAt: null,
          lastLevel: 'ok' as any,
        });
        refillIdleWorkers();
        repaint();
      }
    });

    child.on('exit', () => {
      activeWorkers -= 1;
      workerState.set(i, {
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: 'ok' as any,
      });
      repaint();
    });
  }

  const renderInterval = setInterval(() => repaint(false), 350);

  // graceful Ctrl+C
  let cleanupSwitcher: () => void = () => {};
  const onSigint = () => {
    clearInterval(renderInterval);
    cleanupSwitcher();
    process.stdout.write('\nStopping workers...\n');
    for (const [, w] of workers) {
      if (isIpcOpen(w)) safeSend(w!, { type: 'shutdown' });
      try {
        w?.kill('SIGTERM');
      } catch {}
    }
    this.process.exit(130);
  };
  process.once('SIGINT', onSigint);

  // attach/switch UI with replay
  const detachScreen = () => {
    dashboardPaused = false;
    repaint();
  };
  const attachScreen = (id: number) => {
    dashboardPaused = true;
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write(
      `Attached to worker ${id}. (Esc/Ctrl+] detach • Ctrl+C SIGINT)\n`,
    );
  };

  function safeGetLogPathsForSlot(id: number) {
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

  cleanupSwitcher = installInteractiveSwitcher({
    workers,
    onAttach: attachScreen,
    onDetach: detachScreen,
    onCtrlC: onSigint,
    getLogPaths: (id) => safeGetLogPathsForSlot(id),
    replayBytes: 200 * 1024,
    replayWhich: ['out', 'err'],
    onEnterAttachScreen: attachScreen,
  });

  // hint
  const maxDigit = Math.min(poolSize - 1, 9);
  const digitRange = poolSize <= 1 ? '0' : `0-${maxDigit}`;
  const extra = poolSize > 10 ? ' (Tab/Shift+Tab for ≥10)' : '';
  process.stdout.write(
    colors.dim(
      `\nHotkeys: [${digitRange}] attach${extra} • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • Ctrl+C exit\n\n`,
    ),
  );

  // wait for completion of work (not viewer)
  await new Promise<void>((resolveWork) => {
    const check = setInterval(() => {
      if (pending.length === 0) {
        for (const [id, w] of workers) {
          const st = workerState.get(id);
          if (st && !st.busy && isIpcOpen(w)) {
            safeSend(w!, { type: 'shutdown' });
          }
        }
      }
      if (pending.length === 0 && activeWorkers === 0) {
        clearInterval(check);
        clearInterval(renderInterval);

        repaint(true);

        if ((agg as AnyTotals).mode === 'upload') {
          const a = agg as UploadModeTotals;
          process.stdout.write(
            colors.green(
              `\nAll done. Success:${a.success}  Skipped:${a.skipped}  Error:${a.error}\n`,
            ),
          );
        } else {
          const a = agg as CheckModeTotals;
          process.stdout.write(
            colors.green(
              `\nAll done. Pending:${a.totalPending}  PendingConflicts:${a.pendingConflicts}  PendingSafe:${a.pendingSafe}  Skipped:${a.skipped}\n`,
            ),
          );
        }

        process.stdout.write(
          colors.dim(
            '\nViewer mode — digits to view logs • Tab/Shift+Tab • Esc detach • press q to quit\n',
          ),
        );

        resolveWork();
      }
    }, 300);
  });

  // --- Viewer mode: leave switcher active until user presses 'q' ---
  await new Promise<void>((resolveViewer) => {
    const onKeypress = (buf: Buffer) => {
      const s = buf.toString('utf8');
      if (s === 'q' || s === 'Q') {
        process.stdin.off('data', onKeypress);
        resolveViewer();
      }
    };
    try {
      process.stdin.setRawMode?.(true);
    } catch {}
    process.stdin.resume();
    process.stdin.on('data', onKeypress);
  });

  cleanupSwitcher();
  process.removeListener('SIGINT', onSigint);
}

/* -------------------------------------------------------------------------------------------------
 * If invoked directly as a child process, enter worker loop
 * ------------------------------------------------------------------------------------------------- */
const CHILD_FLAG = '--child-upload-preferences';
if (process.argv.includes(CHILD_FLAG)) {
  runChild().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}
