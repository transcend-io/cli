import { parquetToCsvOneFile, extractErrorMessage } from '../../../lib/helpers';
import type { ToWorker } from '../../../lib/pooling';
import { logger } from '../../../logger';

export type ParquetTask = {
  /** Absolute path of the Parquet file to convert. */
  filePath: string;
  options: {
    /** Optional directory where CSV output files should be written. */
    outputDir?: string;
    /** Whether to clear any pre-existing output before writing new ones. */
    clearOutputDir: boolean;
  };
};

export type ParquetProgress = {
  /** File being processed by the worker. */
  filePath: string;
  /** Rows processed so far. */
  processed: number;
  /** Optional known total rows (not always available). */
  total?: number;
};

export type ParquetResult = {
  ok: boolean;
  filePath: string;
  error?: string;
};

/**
 * Worker loop: convert a single Parquet file to one or more CSV files.
 */
export async function runChild(): Promise<void> {
  const workerId = Number(process.env.WORKER_ID || '0');
  logger.info(`[w${workerId}] ready pid=${process.pid}`);
  process.send?.({ type: 'ready' });

  process.on('message', async (msg: ToWorker<ParquetTask>) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'shutdown') {
      process.exit(0);
    }
    if (msg.type !== 'task') return;

    const { filePath, options } = msg.payload;
    const { outputDir, clearOutputDir } = options;

    try {
      logger.info(`[w${workerId}] processing ${filePath}`);
      await parquetToCsvOneFile({
        filePath,
        outputDir,
        clearOutputDir,
        onProgress: (processed, total) =>
          process.send?.({
            type: 'progress',
            payload: { filePath, processed, total },
          }),
      });

      process.send?.({
        type: 'result',
        payload: { ok: true, filePath },
      });
    } catch (err) {
      const message = extractErrorMessage(err);
      logger.error(`[w${workerId}] ERROR ${filePath}: ${err.stack || message}`);
      process.send?.({
        type: 'result',
        payload: { ok: false, filePath, error: message },
      });
    }
  });

  // keep alive until shutdown
  await new Promise<never>(() => {
    // Do nothing
  });
}
