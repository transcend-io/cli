// impl.ts
import type { LocalContext } from '../../../context';
import colors from 'colors';
import { logger } from '../../../logger';
import { join, resolve } from 'node:path';

import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { computeReceiptsFolder, computeSchemaFile } from './computeFiles';
import { collectCsvFilesOrExit } from './collectCsvFilesOrExit';

import type { ChildProcess } from 'node:child_process';

import { runChild } from './runChild';
import {
  computePoolSize,
  getWorkerLogPaths,
  isIpcOpen,
  safeSend,
  spawnWorkerProcess,
  isWorkerProgressMessage,
  isWorkerReadyMessage,
  isWorkerResultMessage,
  classifyLogLevel,
  makeLineSplitter,
  initLogDir,
  buildExportStatus,
  assignWorkToSlot,
  refillIdleWorkers,
  safeGetLogPathsForSlot,
  WorkerLogPaths,
  WorkerMaps,
  WorkerState,
  makeOnKeypressExtra,
  installInteractiveSwitcher,
} from '../../../lib/pooling';
import { RateCounter } from '../../../lib/helpers';
import {
  renderDashboard,
  AnyTotals,
  isUploadModeTotals,
  isCheckModeTotals,
} from './ui';
import { writeFailingUpdatesCsv, ExportManager } from './artifacts';

import { applyReceiptSummary, FailingUpdateRow } from './receipts';
import { buildCommonOpts } from './buildTaskOptions';

function getCurrentModulePath(): string {
  if (typeof __filename !== 'undefined') return __filename as unknown as string;
  return process.argv[1];
}

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

export async function uploadPreferences(
  this: LocalContext,
  flags: UploadPreferencesCommandFlags,
): Promise<void> {
  const {
    partition,
    file = '',
    directory,
    dryRun,
    skipExistingRecordCheck,
    receiptFileDir,
    schemaFilePath,
    isSilent,
    concurrency,
  } = flags;

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
  const common = buildCommonOpts(flags, schemaFile, receiptsFolder);

  // ---- Worker pool lifecycle ----
  const logDir = initLogDir(directory || receiptsFolder);
  const modulePath = getCurrentModulePath();

  const workers = new Map<number, ChildProcess>();
  const workerState = new Map<number, WorkerState>();
  const slotLogPaths = new Map<number, WorkerLogPaths | undefined>();
  const failingUpdatesMem: FailingUpdateRow[] = [];

  const pending = [...files];
  const totals = { completed: 0, failed: 0 };
  let activeWorkers = 0;

  const agg: AnyTotals = !common.dryRun
    ? {
        mode: 'upload',
        success: 0,
        skipped: 0,
        error: 0,
        errors: {} as Record<string, number>,
      }
    : {
        mode: 'check',
        totalPending: 0,
        pendingConflicts: 0,
        pendingSafe: 0,
        skipped: 0,
      };

  // Export status + manager
  const exportStatus = buildExportStatus(logDir);
  const exportMgr = new ExportManager(logDir);

  // Dashboard
  let dashboardPaused = false;
  const repaint = (final = false): void => {
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
      exportsDir: logDir,
      exportStatus,
    });
  };

  const maps: WorkerMaps = { workers, workerState, slotLogPaths };
  const assign = (id: number): void =>
    assignWorkToSlot(id, pending, common, maps);
  const refill = (): void => refillIdleWorkers(pending, maps, assign);

  // Spawn pool
  for (let i = 0; i < poolSize; i += 1) {
    const child = spawnWorkerProcess({
      id: i,
      modulePath,
      logDir,
      openLogWindows: true,
      isSilent,
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line no-loop-func
    child.on('message', (msg: unknown): void => {
      if (!msg || typeof msg !== 'object') return;

      if (isWorkerReadyMessage(msg)) {
        refill();
        repaint();
        return;
      }

      if (isWorkerProgressMessage(msg)) {
        const { successDelta, successTotal, fileTotal, filePath } =
          msg.payload || {};
        liveSuccessTotal += successDelta || 0;

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

      if (isWorkerResultMessage(msg)) {
        const { ok, filePath, receiptFilepath } = msg.payload || {};
        if (ok) totals.completed += 1;
        else totals.failed += 1;

        applyReceiptSummary({
          receiptsFolder: common.receiptsFolder,
          filePath,
          receiptFilepath,
          agg,
          dryRun,
          failingUpdatesMem,
        });

        const prev = workerState.get(i)!;
        workerState.set(i, {
          ...prev,
          busy: false,
          file: null,
          startedAt: null,
          lastLevel: ok ? 'ok' : 'error',
          progress: undefined,
        });

        refill();
        repaint();
      }
    });

    // eslint-disable-next-line no-loop-func
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
  let cleanupSwitcher: () => void = () => {
    // noop, will be replaced by installInteractiveSwitcher
  };
  const onSigint = (): void => {
    clearInterval(renderInterval);
    cleanupSwitcher();
    process.stdout.write('\nStopping workers...\n');
    for (const [, w] of workers) {
      if (isIpcOpen(w)) safeSend(w!, { type: 'shutdown' });
      try {
        w?.kill('SIGTERM');
      } catch {
        // noop
      }
    }
    this.process.exit(130);
  };
  process.once('SIGINT', onSigint);

  // attach/switch UI with replay
  const detachScreen = (): void => {
    dashboardPaused = false;
    repaint();
  };
  const attachScreen = (id: number): void => {
    dashboardPaused = true;
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write(
      `Attached to worker ${id}. (Esc/Ctrl+] detach • Ctrl+C SIGINT)\n`,
    );
  };

  cleanupSwitcher = installInteractiveSwitcher({
    workers,
    onAttach: attachScreen,
    onDetach: detachScreen,
    onCtrlC: onSigint,
    getLogPaths: (id: number) =>
      safeGetLogPathsForSlot(id, workers, slotLogPaths),
    replayBytes: 200 * 1024,
    replayWhich: ['out', 'err'],
    onEnterAttachScreen: attachScreen,
  });

  // key handlers (viewer/export/dashboard)
  const onKeypressExtra = makeOnKeypressExtra({
    slotLogPaths,
    exportMgr,
    exportStatus,
    onRepaint: () => repaint(),
    onPause: (p) => {
      dashboardPaused = p;
    },
  });

  try {
    process.stdin.setRawMode?.(true);
  } catch {
    // ignore if not supported (e.g. Windows)
  }
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
          const e = exportMgr.exportCombinedLogs(slotLogPaths, 'error');
          exportStatus.error = { path: e, savedAt: Date.now(), exported: true };
          const w = exportMgr.exportCombinedLogs(slotLogPaths, 'warn');
          exportStatus.warn = { path: w, savedAt: Date.now(), exported: true };
          const i = exportMgr.exportCombinedLogs(slotLogPaths, 'info');
          exportStatus.info = { path: i, savedAt: Date.now(), exported: true };
          const a = exportMgr.exportCombinedLogs(slotLogPaths, 'all');
          exportStatus.all = { path: a, savedAt: Date.now(), exported: true };
          const fPath = join(logDir, 'failing-updates.csv');
          const folderName = resolve(logDir, '../');
          await writeFailingUpdatesCsv(folderName, failingUpdatesMem, fPath);
          exportStatus.failuresCsv = {
            path: fPath,
            savedAt: Date.now(),
            exported: true,
          };
          process.stdout.write(
            `\nArtifacts:\n  ${e}\n  ${w}\n  ${i}\n  ${a}\n  ${fPath}\n\n`,
          );
        } catch {
          // noop
        }

        // Final repaint with exportStatus visible & green
        repaint(true);

        if (isUploadModeTotals(agg)) {
          process.stdout.write(
            colors.green(
              `\nAll done. Success:${agg.success.toLocaleString()}  Skipped:${agg.skipped.toLocaleString()}  Error:${agg.error.toLocaleString()}\n`,
            ),
          );
        } else if (isCheckModeTotals(agg)) {
          process.stdout.write(
            colors.green(
              `\nAll done. Pending:${agg.totalPending.toLocaleString()}  PendingConflicts:${agg.pendingConflicts.toLocaleString()}  ` +
                `PendingSafe:${agg.pendingSafe.toLocaleString()}  Skipped:${agg.skipped.toLocaleString()}\n`,
            ),
          );
        } else {
          throw new Error(
            `Unknown totals type, expected UploadModeTotals or CheckModeTotals. ${JSON.stringify(
              agg,
            )}`,
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
    const onKeypress = (buf: Buffer): void => {
      const s = buf.toString('utf8');
      if (s === 'q' || s === 'Q') {
        process.stdin.off('data', onKeypress);
        resolveViewer();
      }
    };
    try {
      process.stdin.setRawMode?.(true);
    } catch {
      // noop
    }
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
