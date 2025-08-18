import type { LocalContext } from '../../../context';
import colors from 'colors';
import { logger } from '../../../logger';
import { collectCsvFilesOrExit } from '../../../lib/helpers/collectCsvFilesOrExit';
import {
  computePoolSize,
  CHILD_FLAG,
  type PoolHooks,
  runPool,
  dashboardPlugin,
} from '../../../lib/pooling';
import { runChild } from './worker';
import { chunkCsvPlugin } from './ui';
import { createExtraKeyHandler } from '../../../lib/pooling/extraKeys';

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

/**
 * A unit of work: instructs a worker to chunk a single CSV file.
 */
export type ChunkTask = {
  /** Absolute path of the CSV file to chunk. */
  filePath: string;
  /** Options controlling output and chunk size. */
  options: {
    /** Optional directory where chunked output files should be written. */
    outputDir?: string;
    /** Whether to clear any pre-existing output chunks before writing new ones. */
    clearOutputDir: boolean;
    /** Approximate target chunk size in MB (well under Node’s string size limits). */
    chunkSizeMB: number;
  };
};

/**
 * Per-worker progress snapshot for the chunk-csv command.
 */
export type ChunkProgress = {
  /** File being processed by the worker. */
  filePath: string;
  /** Number of rows processed so far. */
  processed: number;
  /** Optional total rows in the file (not always known). */
  total?: number;
};

/**
 * Worker result message once a file has finished processing.
 */
export type ChunkResult = {
  /** Whether the file completed successfully. */
  ok: boolean;
  /** File path for which this result applies. */
  filePath: string;
  /** Optional error message if the file failed to chunk. */
  error?: string;
};

/**
 * Totals aggregate for this command.
 * We don’t need custom counters since the runner already tracks
 * completed/failed counts in its header — so we just use an empty record.
 */
type Totals = Record<string, never>;

/**
 * CLI flags accepted by the `chunk-csv` command.
 *
 * These are passed down from the CLI parser into the parent process.
 */
export type ChunkCsvCommandFlags = {
  directory: string;
  outputDir?: string;
  clearOutputDir: boolean;
  chunkSizeMB: number;
  concurrency?: number;
  viewerMode: boolean;
};

/**
 * Parent entrypoint for chunking many CSVs in parallel using the worker pool runner.
 *
 * Lifecycle:
 *  1) Discover CSV inputs (exit if none).
 *  2) Compute pool size (CPU-count heuristic or --concurrency).
 *  3) Build a FIFO queue of `ChunkTask`s.
 *  4) Define pool hooks to drive task assignment, progress, and result handling.
 *  5) Launch the pool with `runPool`, rendering via the `chunkCsvPlugin`.
 *
 * @param this  - Bound CLI context (provides process exit + logging).
 * @param flags - CLI options for the run.
 */
export async function chunkCsvParent(
  this: LocalContext,
  flags: ChunkCsvCommandFlags,
): Promise<void> {
  const {
    directory,
    outputDir,
    clearOutputDir,
    chunkSizeMB,
    concurrency,
    viewerMode,
  } = flags;

  /* 1) Discover CSV inputs */
  const files = collectCsvFilesOrExit(directory, this);

  /* 2) Size the pool */
  const { poolSize, cpuCount } = computePoolSize(concurrency, files.length);

  logger.info(
    colors.green(
      `Chunking ${files.length} CSV file(s) with pool size ${poolSize} (CPU=${cpuCount})`,
    ),
  );

  /* 3) Prepare a simple FIFO queue of tasks (one per file). */
  const queue = files.map<ChunkTask>((filePath) => ({
    filePath,
    options: { outputDir, clearOutputDir, chunkSizeMB },
  }));

  /* 4) Define pool hooks to adapt runner to this command. */
  const hooks: PoolHooks<ChunkTask, ChunkProgress, ChunkResult, Totals> = {
    nextTask: () => queue.shift(),
    taskLabel: (t) => t.filePath,
    initTotals: () => ({} as Totals),
    initSlotProgress: () => undefined,
    onProgress: (totals) => totals,
    onResult: (totals, res) => ({ totals, ok: !!res.ok }),
    // postProcess receives log context when viewerMode=true — we don’t need it here.
    postProcess: async () => {
      // nothing extra for chunk-csv
    },
  };

  /* 5) Launch the pool runner with our hooks and custom dashboard plugin. */
  await runPool({
    title: 'Chunk CSV',
    baseDir: directory || outputDir || process.cwd(),
    childFlag: CHILD_FLAG,
    childModulePath: getCurrentModulePath(),
    poolSize,
    cpuCount,
    filesTotal: files.length,
    hooks,
    viewerMode,
    render: (input) => dashboardPlugin(input, chunkCsvPlugin),
    extraKeyHandler: ({ logsBySlot, repaint, setPaused }) =>
      createExtraKeyHandler({
        logsBySlot,
        repaint,
        setPaused,
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
