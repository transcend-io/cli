// impl.ts
import type { LocalContext } from '../../../context';
import colors from 'colors';
import { logger } from '../../../logger';
import { join } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';

import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { computeReceiptsFolder, computeSchemaFile } from './computeFiles';
import { collectCsvFilesOrExit } from './collectCsvFilesOrExit';

import type { ChildProcess } from 'node:child_process';

import { runChild } from './runChild';
import {
  computePoolSize,
  getWorkerLogPaths,
  isIpcOpen,
  renderDashboard,
  safeSend,
  showCombinedLogs,
  spawnWorkerProcess,
} from '../../../lib/pooling';
import { installInteractiveSwitcher } from '../../../lib/pooling/installInteractiveSwitcher';
import {
  classifyLogLevel,
  makeLineSplitter,
  resetWorkerLogs,
} from '../../../lib/pooling/logRotation';
import type { WorkerState } from '../../../lib/pooling/assignWorkToWorker';
import { RateCounter } from '../../../lib/helpers';
import { resolveReceiptPath } from './resolveReceiptPath';
import {
  exportCombinedLogs,
  readFailingUpdatesFromReceipt,
  writeFailingUpdatesCsv,
  type FailingUpdateRow,
} from '../../../lib/pooling/downloadArtifact';
import type {
  ExportStatusMap,
  ExportArtifactStatus,
} from '../../../lib/pooling/renderDashboard';

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
  uploadConcurrency: number;
  maxChunkSize: number;
  rateLimitRetryDelay: number;
  uploadLogInterval: number;
  maxRecordsToReceipt: number;
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
  | 'uploadConcurrency'
  | 'uploadLogInterval'
  | 'maxChunkSize'
  | 'rateLimitRetryDelay'
  | 'maxRecordsToReceipt'
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
 * Summarize a receipts JSON into dashboard counters.
 *
 * @param receiptPath
 * @param dryRun
 */
function summarizeReceipt(receiptPath: string, dryRun: boolean): AnyTotals {
  try {
    const raw = readFileSync(receiptPath, 'utf8');
    const json = JSON.parse(raw) as any;

    const skippedCount = Object.values(json?.skippedUpdates ?? {}).length;

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

function getCurrentModulePath(): string {
  // @ts-ignore - __filename exists in CJS/ts-node
  if (typeof __filename !== 'undefined') return __filename as unknown as string;
  return process.argv[1];
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
    maxChunkSize,
    maxRecordsToReceipt,
    rateLimitRetryDelay,
    identifierColumns,
    uploadConcurrency,
    uploadLogInterval,
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

  // Throughput metering (records/s)
  const meter = new RateCounter();
  let liveSuccessTotal = 0;

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
    uploadConcurrency,
    maxChunkSize,
    rateLimitRetryDelay,
    maxRecordsToReceipt,
    uploadLogInterval,
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
  const failingUpdatesMem: FailingUpdateRow[] = [];

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

  // Export status shown permanently in the dashboard
  const exportStatus: ExportStatusMap = {
    error: { path: join(LOG_DIR, 'combined-errors.log') },
    warn: { path: join(LOG_DIR, 'combined-warns.log') },
    info: { path: join(LOG_DIR, 'combined-info.log') },
    all: { path: join(LOG_DIR, 'combined-all.log') },
    failuresCsv: { path: join(LOG_DIR, 'failing-updates.csv') },
  };

  let dashboardPaused = false;
  const repaint = (final = false) => {
    if (dashboardPaused && !final) return;
    renderDashboard({
      poolSize,
      cpuCount,
      filesTotal: files.length,
      filesCompleted: totals.completed,
      filesFailed: totals.failed,
      workerState,
      totals: agg,
      final,
      throughput: {
        successSoFar: liveSuccessTotal,
        r10s: meter.rate(10_000),
        r60s: meter.rate(60_000),
      },
      exportsDir: LOG_DIR,
      exportStatus,
    });
  };

  const assignWorkToSlot = (id: number) => {
    const w = workers.get(id);
    if (!isIpcOpen(w)) {
      const prev = workerState.get(id);
      workerState.set(id, {
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: prev?.lastLevel ?? 'ok',
        progress: undefined,
      });
      return;
    }

    const filePath = pending.shift();
    if (!filePath) {
      const prev = workerState.get(id);
      workerState.set(id, {
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: prev?.lastLevel ?? 'ok',
        progress: undefined,
      });
      return;
    }

    workerState.set(id, {
      busy: true,
      file: filePath,
      startedAt: Date.now(),
      lastLevel: 'ok',
      progress: undefined,
    });

    if (
      !safeSend(w!, { type: 'task', payload: { filePath, options: common } })
    ) {
      // IPC closed between check and send; requeue and mark idle
      pending.unshift(filePath);
      const prev = workerState.get(id);
      workerState.set(id, {
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: prev?.lastLevel ?? 'ok',
        progress: undefined,
      });
    }
  };

  const refillIdleWorkers = () => {
    for (const [id] of workers) {
      const st = workerState.get(id);
      if (!st || !st.busy) {
        if (pending.length === 0) break;
        assignWorkToSlot(id);
      }
    }
  };

  // Spawn the pool
  for (let i = 0; i < poolSize; i += 1) {
    const child = spawnWorkerProcess({
      id: i,
      modulePath,
      logDir: LOG_DIR,
      openLogWindows: true,
      isSilent,
      // childFlag omitted: spawn uses its own default CHILD_FLAG
    });
    workers.set(i, child);
    workerState.set(i, {
      busy: false,
      file: null,
      startedAt: null,
      lastLevel: 'ok',
      progress: undefined,
    });
    slotLogPaths.set(i, getWorkerLogPaths(child));
    activeWorkers += 1;

    // Live WARN/ERROR status from stderr
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

      if (msg.type === 'progress') {
        const { successDelta, successTotal, fileTotal, filePath } =
          msg.payload || {};
        liveSuccessTotal += successDelta || 0;

        // Update that worker’s live progress bar
        const prev = workerState.get(i)!;
        const processed = successTotal ?? prev.progress?.processed ?? 0;
        const total = fileTotal ?? prev.progress?.total ?? 0;
        workerState.set(i, {
          ...prev,
          file: prev.file ?? filePath ?? prev.file,
          progress: { processed, total },
        });

        if (successDelta) meter.add(successDelta);
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

          failingUpdatesMem.push(
            ...readFailingUpdatesFromReceipt(resolved, filePath),
          );
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

        // Mark idle; keep ERROR badge for failed task until next assignment
        const prev = workerState.get(i)!;
        workerState.set(i, {
          ...prev,
          busy: false,
          file: null,
          startedAt: null,
          lastLevel: ok ? 'ok' : 'error',
          progress: undefined,
        });

        refillIdleWorkers();
        repaint();
      }
    });

    child.on('exit', (code, signal) => {
      activeWorkers -= 1;

      const prev = workerState.get(i)!;
      const abnormal = (typeof code === 'number' && code !== 0) || !!signal;

      workerState.set(i, {
        ...prev,
        busy: false,
        file: null,
        startedAt: null,
        lastLevel: abnormal ? 'error' : prev.lastLevel ?? 'ok',
        progress: undefined,
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
    getLogPaths: (id: number) => safeGetLogPathsForSlot(id),
    replayBytes: 200 * 1024,
    replayWhich: ['out', 'err'],
    onEnterAttachScreen: attachScreen,
  });

  // Lowercase keys open viewers; Uppercase keys write export files.
  //   e -> errors viewer (stderr filtered to ERROR)
  //   w -> warnings viewer (warn file + stderr non-error)
  //   i -> info viewer (info file)
  //   l -> all logs viewer (out + err + structured)
  //   E -> export combined errors
  //   W -> export combined warns
  //   I -> export combined info
  //   A -> export combined ALL logs
  //   F -> export failing-updates CSV
  //   Esc / Ctrl+] -> return to dashboard
  const onKeypressExtra = (buf: Buffer): void => {
    const s = buf.toString('utf8');

    const view = (
      sources: Array<'out' | 'err' | 'structured' | 'warn' | 'info'>,
      level: 'error' | 'warn' | 'all',
    ) => {
      dashboardPaused = true;
      showCombinedLogs(slotLogPaths, sources, level);
    };

    const noteExport = (slot: keyof ExportStatusMap, p: string) => {
      const now = Date.now();
      const current: ExportArtifactStatus = exportStatus[slot] || { path: p };
      exportStatus[slot] = {
        path: p || current.path,
        savedAt: now,
        exported: true,
      };
      repaint();
    };

    // --- viewers (lowercase) ---
    if (s === 'e') return view(['err'], 'error');
    if (s === 'w') return view(['warn', 'err'], 'warn');
    if (s === 'i') return view(['info'], 'all');
    if (s === 'l') return view(['out', 'err', 'structured'], 'all');

    // --- exports (uppercase) ---
    if (s === 'E') {
      void exportCombinedLogs(slotLogPaths, 'error', LOG_DIR)
        .then((p) => {
          process.stdout.write(`\nWrote combined error logs to: ${p}\n`);
          noteExport('error', p);
        })
        .catch(() =>
          process.stdout.write('\nFailed to write combined error logs\n'),
        );
      return;
    }
    if (s === 'W') {
      void exportCombinedLogs(slotLogPaths, 'warn', LOG_DIR)
        .then((p) => {
          process.stdout.write(`\nWrote combined warn logs to: ${p}\n`);
          noteExport('warn', p);
        })
        .catch(() =>
          process.stdout.write('\nFailed to write combined warn logs\n'),
        );
      return;
    }
    if (s === 'I') {
      void exportCombinedLogs(slotLogPaths, 'info', LOG_DIR)
        .then((p) => {
          process.stdout.write(`\nWrote combined info logs to: ${p}\n`);
          noteExport('info', p);
        })
        .catch(() =>
          process.stdout.write('\nFailed to write combined info logs\n'),
        );
      return;
    }
    if (s === 'A') {
      void exportCombinedLogs(slotLogPaths, 'all', LOG_DIR)
        .then((p) => {
          process.stdout.write(`\nWrote combined ALL logs to: ${p}\n`);
          noteExport('all', p);
        })
        .catch(() =>
          process.stdout.write('\nFailed to write combined ALL logs\n'),
        );
      return;
    }
    if (s === 'F') {
      const dest = join(LOG_DIR, 'failing-updates.csv');
      void writeFailingUpdatesCsv(failingUpdatesMem, dest)
        .then((p) => {
          process.stdout.write(`\nWrote failing updates CSV to: ${p}\n`);
          noteExport('failuresCsv', p);
        })
        .catch(() =>
          process.stdout.write('\nFailed to write failing updates CSV\n'),
        );
      return;
    }

    // --- back to dashboard ---
    if (s === '\x1b' || s === '\x1d') {
      dashboardPaused = false;
      repaint();
    }
  };

  try {
    process.stdin.setRawMode?.(true);
  } catch {}
  process.stdin.resume();
  process.stdin.on('data', onKeypressExtra);

  // wait for completion of work (not viewer)
  await new Promise<void>((resolveWork) => {
    const check = setInterval(async () => {
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

        // Final “auto-export” of artifacts
        try {
          const e = await exportCombinedLogs(slotLogPaths, 'error', LOG_DIR);
          exportStatus.error = { path: e, savedAt: Date.now(), exported: true };
          const w = await exportCombinedLogs(slotLogPaths, 'warn', LOG_DIR);
          exportStatus.warn = { path: w, savedAt: Date.now(), exported: true };
          const i = await exportCombinedLogs(slotLogPaths, 'info', LOG_DIR);
          exportStatus.info = { path: i, savedAt: Date.now(), exported: true };
          const a = await exportCombinedLogs(slotLogPaths, 'all', LOG_DIR);
          exportStatus.all = { path: a, savedAt: Date.now(), exported: true };
          const fPath = join(LOG_DIR, 'failing-updates.csv');
          await writeFailingUpdatesCsv(failingUpdatesMem, fPath);
          exportStatus.failuresCsv = {
            path: fPath,
            savedAt: Date.now(),
            exported: true,
          };
          process.stdout.write(
            `\nArtifacts:\n  ${e}\n  ${w}\n  ${i}\n  ${a}\n  ${fPath}\n\n`,
          );
        } catch {
          // ignore
        }

        // Final repaint with exportStatus visible & green
        repaint(true);

        if ((agg as AnyTotals).mode === 'upload') {
          const a = agg as UploadModeTotals;
          process.stdout.write(
            colors.green(
              `\nAll done. Success:${a.success.toLocaleString()}  Skipped:${a.skipped.toLocaleString()}  Error:${a.error.toLocaleString()}\n`,
            ),
          );
        } else {
          const a = agg as CheckModeTotals;
          process.stdout.write(
            colors.green(
              `\nAll done. Pending:${a.totalPending.toLocaleString()}  PendingConflicts:${a.pendingConflicts.toLocaleString()}  ` +
                `PendingSafe:${a.pendingSafe.toLocaleString()}  Skipped:${a.skipped.toLocaleString()}\n`,
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
