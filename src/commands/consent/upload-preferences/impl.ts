import type { LocalContext } from '../../../context';
import colors from 'colors';
import { logger } from '../../../logger';
import { join } from 'node:path';

import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { collectCsvFilesOrExit } from '../../../lib/helpers/collectCsvFilesOrExit';

import {
  computePoolSize,
  CHILD_FLAG,
  type PoolHooks,
  runPool,
  dashboardPlugin,
  buildExportStatus,
  createExtraKeyHandler,
} from '../../../lib/pooling';

import { runChild } from './worker';
import {
  computeReceiptsFolder,
  computeSchemaFile,
  ExportManager,
  writeFailingUpdatesCsv,
  type FailingUpdateRow,
} from './artifacts';
import { applyReceiptSummary } from './artifacts/receipts';
import { buildCommonOpts } from './buildTaskOptions';
import {
  AnyTotals,
  isUploadModeTotals,
  isCheckModeTotals,
  uploadPreferencesPlugin,
} from './ui';

/**
 * A unit of work: instructs a worker to upload (or check) a single CSV file.
 */
export type UploadPreferencesTask = {
  /** Absolute path of the CSV file to process. */
  filePath: string;
  /** Command/worker options shared across tasks (built from CLI flags). */
  options: ReturnType<typeof buildCommonOpts>;
};

/**
 * Per-worker progress snapshot emitted by the worker.
 * This mirrors the previous IPC progress payload for this command.
 */
export type UploadPreferencesProgress = {
  /** File currently being processed. */
  filePath: string;
  /** New successes since the last progress message (used to compute rates). */
  successDelta?: number;
  /** Cumulative successes so far for the current file. */
  successTotal?: number;
  /** Optional total row count for the file (if known). */
  fileTotal?: number;
};

/**
 * Final result for a single file.
 */
export type UploadPreferencesResult = {
  /** Success flag for the file. */
  ok: boolean;
  /** File this result pertains to. */
  filePath: string;
  /** Optional path to the worker-generated receipt file. */
  receiptFilepath?: string;
  /** Optional error string when `ok === false`. */
  error?: string;
};

/**
 * Aggregate totals shown in the dashboard.
 * This command supports two modes:
 *  - upload mode totals
 *  - check mode totals
 *
 * The union is already defined in `./ui` as `AnyTotals`.
 */
type Totals = AnyTotals;

/**
 * Returns the current module's path so the worker pool knows what file to re-exec.
 * In Node ESM, __filename is undefined, so we fall back to argv[1].
 *
 * @returns The current module's path as a string
 */
function getCurrentModulePath(): string {
  if (typeof __filename !== 'undefined') {
    return __filename as unknown as string;
  }
  return process.argv[1];
}

export interface UploadPreferencesCommandFlags {
  auth: string;
  partition: string;
  sombraAuth?: string;
  transcendUrl: string;
  directory: string;
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
  downloadIdentifierConcurrency: number;
  maxRecordsToReceipt: number;
  allowedIdentifierNames: string[];
  identifierColumns: string[];
  columnsToIgnore?: string[];
  skipMetadata: boolean;
  viewerMode: boolean;
}

/**
 * Parent entrypoint for uploading/checking many preference CSVs in parallel.
 *
 * Flow:
 *  1) Validate inputs & discover CSV files (exit if none).
 *  2) Compute pool size from `--concurrency` or CPU heuristic.
 *  3) Build `common` worker options and task queue (one task per file).
 *  4) Define `PoolHooks` for task scheduling, progress, and results aggregation.
 *  5) Launch the pool with `runPool`, rendering via `dashboardPlugin(uploadPreferencesPlugin)`.
 *
 * All log exporting / artifact work that used to be done in “viewer mode” can be handled
 * in `postProcess` using the new log context from the runner.
 *
 * @param flags - CLI options for the run.
 * @returns Promise that resolves when the pool completes.
 */
export async function uploadPreferences(
  this: LocalContext,
  flags: UploadPreferencesCommandFlags,
): Promise<void> {
  const {
    auth,
    partition,
    sombraAuth,
    transcendUrl,
    directory,
    dryRun,
    skipExistingRecordCheck,
    receiptFileDir,
    schemaFilePath,
    isSilent,
    concurrency,
    attributes,
    receiptFilepath,
    uploadConcurrency,
    maxChunkSize,
    rateLimitRetryDelay,
    uploadLogInterval,
    downloadIdentifierConcurrency,
    maxRecordsToReceipt,
    allowedIdentifierNames,
    identifierColumns,
    columnsToIgnore,
    skipWorkflowTriggers,
    forceTriggerWorkflows,
    skipConflictUpdates,
    viewerMode,
  } = flags;

  /* 1) Validate & find inputs */
  const files = collectCsvFilesOrExit(directory, this);
  doneInputValidation(this.process.exit);

  logger.info(
    colors.green(
      `Processing ${files.length} consent preferences files for partition: ${partition}`,
    ),
  );
  logger.debug(
    `Files to process:\n${files.slice(0, 10).join('\n')}\n${
      files.length > 10 ? `... and ${files.length - 10} more` : ''
    }`,
  );

  if (skipExistingRecordCheck) {
    logger.info(colors.bgYellow('Skipping existing record check: true'));
  }

  const receiptsFolder = computeReceiptsFolder(receiptFileDir, directory);
  const schemaFile = computeSchemaFile(schemaFilePath, directory, files[0]);

  /* 2) Pool size */
  const { poolSize, cpuCount } = computePoolSize(concurrency, files.length);

  /* 3) Build shared worker options and queue */
  const common = buildCommonOpts(
    {
      ...flags,
      // explicit for clarity (even if buildCommonOpts infers these):
      auth,
      partition,
      sombraAuth,
      transcendUrl,
      dryRun,
      skipExistingRecordCheck,
      skipWorkflowTriggers,
      forceTriggerWorkflows,
      skipConflictUpdates,
      isSilent,
      attributes,
      receiptFilepath,
      uploadConcurrency,
      maxChunkSize,
      rateLimitRetryDelay,
      uploadLogInterval,
      downloadIdentifierConcurrency,
      maxRecordsToReceipt,
      allowedIdentifierNames,
      identifierColumns,
      columnsToIgnore,
    },
    schemaFile,
    receiptsFolder,
  );

  // FIFO queue: one task per file
  const queue = files.map<UploadPreferencesTask>((filePath) => ({
    filePath,
    options: common,
  }));

  // Dashboard artifacts/export status (shown during renders)
  // inside uploadPreferences() before runPool call:
  const exportMgr = new ExportManager(receiptsFolder);
  const exportStatus = buildExportStatus(receiptsFolder);
  const failingUpdatesMem: FailingUpdateRow[] = [];

  /* 4) Hooks */
  const hooks: PoolHooks<
    UploadPreferencesTask,
    UploadPreferencesProgress,
    UploadPreferencesResult,
    Totals
  > = {
    nextTask: () => queue.shift(),
    taskLabel: (t) => t.filePath,
    initTotals: () =>
      !common.dryRun
        ? ({
            mode: 'upload',
            success: 0,
            skipped: 0,
            error: 0,
            errors: {},
          } as Totals)
        : ({
            mode: 'check',
            totalPending: 0,
            pendingConflicts: 0,
            pendingSafe: 0,
            skipped: 0,
          } as Totals),
    initSlotProgress: () => undefined,
    onProgress: (totals) => totals,
    onResult: (totals, res) => {
      applyReceiptSummary({
        receiptsFolder: common.receiptsFolder,
        filePath: res.filePath,
        receiptFilepath: res.receiptFilepath,
        agg: totals,
        dryRun: common.dryRun,
        failingUpdatesMem,
      });
      return { totals, ok: !!res.ok };
    },
    exportStatus: () => exportStatus,
    /**
     * Finalization after all workers exit.
     * With the new runner you also receive:
     *   - logDir
     *   - logsBySlot (Map<slotId, WorkerLogPaths | undefined>)
     *   - startedAt / finishedAt
     *   - getLogPathsForSlot(id)
     *   - viewerMode (boolean)
     *
     * @param options - Options with logDir, logsBySlot, startedAt, finishedAt, etc.
     */
    postProcess: async ({ totals, logsBySlot }) => {
      try {
        // Persist failing updates CSV next to receipts/logDir.
        const fPath = join(receiptsFolder, 'failing-updates.csv');
        await writeFailingUpdatesCsv(failingUpdatesMem, fPath);
        exportStatus.failuresCsv = {
          path: fPath,
          savedAt: Date.now(),
          exported: true,
        };

        // Save logs
        await Promise.all([
          exportMgr.exportCombinedLogs(logsBySlot, 'error'),
          exportMgr.exportCombinedLogs(logsBySlot, 'warn'),
          exportMgr.exportCombinedLogs(logsBySlot, 'info'),
          exportMgr.exportCombinedLogs(logsBySlot, 'all'),
        ]);

        // Summarize totals to stdout (parity with the old implementation)
        if (isUploadModeTotals(totals)) {
          logger.info(
            colors.green(
              `All done. Success:${totals.success.toLocaleString()}  ` +
                `Skipped:${totals.skipped.toLocaleString()}  ` +
                `Error:${totals.error.toLocaleString()}`,
            ),
          );
        } else if (isCheckModeTotals(totals)) {
          logger.info(
            colors.green(
              `All done. Pending:${totals.totalPending.toLocaleString()}  ` +
                `PendingConflicts:${totals.pendingConflicts.toLocaleString()}  ` +
                `PendingSafe:${totals.pendingSafe.toLocaleString()}  ` +
                `Skipped:${totals.skipped.toLocaleString()}`,
            ),
          );
        }
      } catch (err: unknown) {
        logger.error(colors.red(`Failed to export artifacts: ${String(err)}`));
      }
    },
  };

  /* 5) Launch the pool runner with our hooks and dashboard plugin. */
  await runPool<
    UploadPreferencesTask,
    UploadPreferencesProgress,
    UploadPreferencesResult,
    Totals
  >({
    title: `Upload Preferences - ${directory}`,
    baseDir: directory || receiptsFolder || process.cwd(),
    childFlag: CHILD_FLAG,
    childModulePath: getCurrentModulePath(),
    poolSize,
    cpuCount,
    filesTotal: files.length,
    hooks,
    viewerMode,
    render: (input) => dashboardPlugin(input, uploadPreferencesPlugin),
    extraKeyHandler: ({ logsBySlot, repaint, setPaused }) =>
      createExtraKeyHandler({
        logsBySlot,
        repaint,
        setPaused,
        exportMgr, // enables E/W/I/A
        exportStatus, // keeps the exports panel updated
        custom: {
          F: async ({ noteExport, say }) => {
            const fPath = join(receiptsFolder, 'failing-updates.csv');
            await writeFailingUpdatesCsv(failingUpdatesMem, fPath);
            say(`\nWrote failing updates CSV to: ${fPath}`);
            noteExport('failuresCsv', fPath);
          },
        },
      }),
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
