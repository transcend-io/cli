import type { LocalContext } from '../../../context';
import colors from 'colors';
import { logger } from '../../../logger';
import { collectParquetFilesOrExit } from '../../../lib/helpers';
import {
  computePoolSize,
  createExtraKeyHandler,
  CHILD_FLAG,
  type PoolHooks,
  runPool,
  dashboardPlugin,
} from '../../../lib/pooling';
import {
  runChild,
  type ParquetProgress,
  type ParquetResult,
  type ParquetTask,
} from './worker';
import { parquetToCsvPlugin } from './ui';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

/**
 * Returns the current module's path so the worker pool knows what file to re-exec.
 * In Node ESM, __filename is undefined, so we fall back to argv[1].
 *
 * @returns The current module's path.
 */
function getCurrentModulePath(): string {
  if (typeof __filename !== 'undefined') {
    return __filename as unknown as string;
  }
  return process.argv[1];
}

/** No custom totals for the header; the runner’s built-ins suffice. */
type Totals = Record<string, never>;

export type ParquetToCsvCommandFlags = {
  directory: string;
  outputDir?: string;
  clearOutputDir: boolean;
  concurrency?: number;
  viewerMode: boolean;
};

/**
 * Convert all Parquet files in a directory to CSV, in parallel.
 *
 * @param flags - The command flags.
 */
export async function parquetToCsv(
  this: LocalContext,
  flags: ParquetToCsvCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const { directory, outputDir, clearOutputDir, concurrency, viewerMode } =
    flags;

  /* 1) Discover .parquet inputs */
  const files = collectParquetFilesOrExit(directory, this);

  /* 2) Size the pool */
  const { poolSize, cpuCount } = computePoolSize(concurrency, files.length);

  logger.info(
    colors.green(
      `Converting ${files.length} Parquet file(s) → CSV with pool size ${poolSize} (CPU=${cpuCount})`,
    ),
  );

  /* 3) Build FIFO queue of tasks (one per file) */
  const queue = files.map<ParquetTask>((filePath) => ({
    filePath,
    options: { outputDir, clearOutputDir },
  }));

  /* 4) Pool hooks */
  const hooks: PoolHooks<ParquetTask, ParquetProgress, ParquetResult, Totals> =
    {
      nextTask: () => queue.shift(),
      taskLabel: (t) => t.filePath,
      initTotals: () => ({} as Totals),
      initSlotProgress: () => undefined,
      onProgress: (totals) => totals,
      onResult: (totals, res) => ({ totals, ok: !!res.ok }),
      postProcess: async () => {
        // nothing special post-run
      },
    };

  /* 5) Launch the pool runner with custom dashboard plugin */
  await runPool({
    title: `Parquet → CSV - ${directory}`,
    baseDir: directory || outputDir || process.cwd(),
    childFlag: CHILD_FLAG,
    childModulePath: getCurrentModulePath(),
    poolSize,
    cpuCount,
    filesTotal: files.length,
    hooks,
    viewerMode,
    render: (input) => dashboardPlugin(input, parquetToCsvPlugin, viewerMode),
    extraKeyHandler: ({ logsBySlot, repaint, setPaused }) =>
      createExtraKeyHandler({ logsBySlot, repaint, setPaused }),
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
