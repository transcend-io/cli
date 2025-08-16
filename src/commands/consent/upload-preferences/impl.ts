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
      return { mode: 'upload', success, skipped: skippedCount, error: failed };
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
      ? { mode: 'upload', success: 0, skipped: 0, error: 0 }
      : {
          mode: 'check',
          totalPending: 0,
          pendingConflicts: 0,
          pendingSafe: 0,
          skipped: 0,
        };
  }
}

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
  const LOG_DIR = join(receiptsFolder, 'logs');
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
  let activeWorkers = 0; // track only live workers

  const agg: AnyTotals = !common.dryRun
    ? { mode: 'upload', success: 0, skipped: 0, error: 0 }
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
    if (!w) return;
    const filePath = pending.shift();
    if (!filePath) {
      const prev = workerState.get(id) || ({} as WorkerState);
      workerState.set(id, {
        ...prev,
        busy: false,
        file: null,
        startedAt: null,
      });
      return;
    }
    workerState.set(id, { busy: true, file: filePath, startedAt: Date.now() });
    w.send?.({ type: 'task', payload: { filePath, options: common } });
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
    workerState.set(i, { busy: false, file: null, startedAt: null });
    slotLogPaths.set(i, getWorkerLogPaths(child));
    activeWorkers += 1;

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
          } else if (summary.mode === 'check' && agg.mode === 'check') {
            agg.totalPending += summary.totalPending;
            agg.pendingConflicts += summary.pendingConflicts;
            agg.pendingSafe += summary.pendingSafe;
            agg.skipped += summary.skipped;
          }
        }

        workerState.set(i, { busy: false, file: null, startedAt: null });
        refillIdleWorkers();
        repaint();
      }
    });

    child.on('exit', () => {
      // keep the slot so digits still map to a worker index
      activeWorkers -= 1;
      // (leave the ChildProcess object in the map; switcher will read logs via slotLogPaths)
      workerState.set(i, { busy: false, file: null, startedAt: null });
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
    // attempt graceful shutdown for any idles; busy ones will have exited already
    for (const [, w] of workers) {
      if (w && w.connected && (w as any).channel) {
        try {
          w.send({ type: 'shutdown' });
        } catch {}
      }
      try {
        w.kill('SIGTERM');
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

  // NEW: make a helper that avoids ?? and only uses explicit guards
  function safeGetLogPathsForSlot(id: number) {
    const live = workers.get(id);
    // Prefer live worker paths if the IPC channel is still open
    if (live && live.connected && (live as any).channel) {
      try {
        const p = getWorkerLogPaths(live);
        if (p !== undefined && p !== null) return p;
      } catch {
        // fall through to snapshot
      }
    }
    // Fall back to the snapshot we saved at spawn time
    return slotLogPaths.get(id);
  }

  cleanupSwitcher = installInteractiveSwitcher({
    workers,
    onAttach: attachScreen,
    onDetach: detachScreen,
    onCtrlC: onSigint,
    getLogPaths: (id) => safeGetLogPathsForSlot(id), // <— no ?? here
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
      // If the queue is empty, request shutdown for **idle** workers only.
      if (pending.length === 0) {
        for (const [id, w] of workers) {
          const st = workerState.get(id);
          // Only try to signal live children; exited ones keep their slot for log viewing
          if (st && !st.busy && w && w.connected && (w as any).channel) {
            try {
              w.send({ type: 'shutdown' });
            } catch {
              /* ignore */
            }
          }
        }
      }
      // Done when queue is empty and all live workers have exited.
      if (pending.length === 0 && activeWorkers === 0) {
        clearInterval(check);
        clearInterval(renderInterval);

        // Persist the final snapshot; keep switcher OPEN for viewer mode
        repaint(true);

        // Print summary line (don’t exit yet)
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

        // Tell the user they can browse logs and press 'q' to quit
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

  // Cleanup switcher now that the user quit viewer mode
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
