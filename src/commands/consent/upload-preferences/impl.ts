// main.ts
import type { LocalContext } from '../../../context';
import colors from 'colors';
import { logger } from '../../../logger';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { computeReceiptsFolder, computeSchemaFile } from './computeFiles';
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
  /** Path to the schema file */
  schemaFile: string;
  /** Directory to store receipt files */
  receiptsFolder: string;
};

/**
 * In CJS, __filename is available; use it as the path to fork.
 */
function getCurrentModulePath(): string {
  // @ts-ignore - __filename is present in CJS/ts-node
  if (typeof __filename !== 'undefined') return __filename as unknown as string;
  return process.argv[1];
}

/**
 * Compute pool size from flags or CPU count
 *
 * @param concurrency
 * @param filesCount
 */
function computePoolSize(concurrency: number | undefined, filesCount: number) {
  const cpuCount = Math.max(1, availableParallelism?.() ?? 1);
  const desired =
    typeof concurrency === 'number' && concurrency > 0
      ? Math.min(concurrency, filesCount)
      : Math.min(cpuCount, filesCount);
  return { poolSize: desired, cpuCount };
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
  // Build the set of CSV files we need to process
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

  // Resolve I/O targets (receipts + schema)
  const receiptsFolder = computeReceiptsFolder(receiptFileDir, directory);
  const schemaFile = computeSchemaFile(schemaFilePath, directory, files[0]);

  // Size the worker pool
  const { poolSize, cpuCount } = computePoolSize(concurrency, files.length);
  const common: TaskCommonOpts = {
    /* same as before */ schemaFile,
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

  const LOG_DIR = join(receiptsFolder, 'logs');
  mkdirSync(LOG_DIR, { recursive: true });

  const RESET_MODE =
    (process.env.RESET_LOGS as 'truncate' | 'delete') ?? 'delete'; // FIXME
  resetWorkerLogs(LOG_DIR, RESET_MODE);

  const modulePath = getCurrentModulePath();
  const workers = new Map<number, ChildProcess>();
  const workerState = new Map<number, WorkerState>();
  const pending = [...files];
  const totals = { completed: 0, failed: 0 };

  let dashboardPaused = false;
  const repaint = () => {
    if (!dashboardPaused) {
      renderDashboard(
        poolSize,
        cpuCount,
        files.length,
        totals.completed,
        totals.failed,
        workerState,
      );
    }
  };

  const assignWorkToWorker = (id: number) => {
    const w = workers.get(id);
    if (!w) return;
    const filePath = pending.shift();
    if (!filePath) {
      workerState.set(id, { busy: false, file: null, startedAt: null });
      return;
    }
    workerState.set(id, { busy: true, file: filePath, startedAt: Date.now() });
    w.send?.({ type: 'task', payload: { filePath, options: common } });
  };

  // spawn pool
  for (let i = 0; i < poolSize; i += 1) {
    const child = spawnWorkerProcess(i, modulePath, LOG_DIR, true, isSilent);
    workers.set(i, child);
    workerState.set(i, { busy: false, file: null, startedAt: null });

    child.on('message', (msg: any) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'ready') {
        assignWorkToWorker(i);
        repaint();
      } else if (msg.type === 'result') {
        const { ok } = msg.payload || {};
        if (ok) totals.completed += 1;
        else totals.failed += 1;
        workerState.set(i, { busy: false, file: null, startedAt: null });
        assignWorkToWorker(i);
        repaint();
      }
    });
    child.on('exit', () => {
      workers.delete(i);
      workerState.set(i, { busy: false, file: null, startedAt: null });
      repaint();
    });
  }

  const renderInterval = setInterval(repaint, 350);

  // graceful Ctrl+C
  const onSigint = () => {
    clearInterval(renderInterval);
    cleanupSwitcher();
    process.stdout.write('\nStopping workers...\n');
    for (const [, w] of workers) {
      try {
        w.send?.({ type: 'shutdown' });
      } catch {}
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
    process.stdout.write('\x1b[2J\x1b[H'); // clear
    process.stdout.write(
      `Attached to worker ${id}. (Esc/Ctrl+] detach • Ctrl+C SIGINT • Ctrl+D EOF)\n`,
    );
  };
  const cleanupSwitcher = installInteractiveSwitcher({
    workers,
    onAttach: attachScreen,
    onDetach: detachScreen,
    onCtrlC: onSigint,
    getLogPaths: (id) => {
      const w = workers.get(id);
      return w ? getWorkerLogPaths(w) : undefined;
    },
    replayBytes: 200 * 1024, // last ~200KB
    replayWhich: ['out', 'err'], // also add 'structured' if you want
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

  // wait for completion
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (pending.length === 0 && workers.size === 0) {
        clearInterval(check);
        clearInterval(renderInterval);
        detachScreen();
        cleanupSwitcher();
        process.stdout.write('\nAll done.\n');
        resolve();
      } else if (pending.length === 0) {
        for (const [, w] of workers) w.send?.({ type: 'shutdown' });
      }
    }, 300);
  });

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
