import { extractErrorMessage } from '../../../lib/helpers';
import { chunkOneCsvFile } from '../../../lib/helpers/chunkOneCsvFile';
import type { ToWorker } from '../../../lib/pooling';
import { logger } from '../../../logger';

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
 * Worker entrypoint.
 *
 * Lifecycle:
 * 1) Announce readiness to the parent via `{ type: 'ready' }`.
 * 2) Wait for `{ type: 'task' }` messages; for each, call `chunkOneCsvFile(...)`.
 *    - While chunking, forward progress to the parent via `{ type: 'progress' }`.
 *    - On completion, send `{ type: 'result', ok: true }`.
 *    - On error, send `{ type: 'result', ok: false, error }` and exit(1).
 * 3) On `{ type: 'shutdown' }`, exit(0) gracefully.
 *
 * Notes:
 * - This process is typically spawned by a pool manager that assigns file paths to workers.
 * - The long-lived promise at the end keeps the worker alive between tasks until the parent
 *   sends an explicit shutdown.
 */
export async function runChild(): Promise<void> {
  const workerId = Number(process.env.WORKER_ID || '0');
  logger.info(`[w${workerId}] ready pid=${process.pid}`);

  // Notify the parent that the worker is ready to receive tasks.
  process.send?.({ type: 'ready' });

  // Main message loop: receive tasks and shutdown requests from the parent.
  process.on('message', async (msg: ToWorker<ChunkTask>) => {
    if (!msg || typeof msg !== 'object') return;

    // Graceful shutdown: let the parent control lifecycle.
    if (msg.type === 'shutdown') {
      process.exit(0);
    }

    // Only handle task messages here.
    if (msg.type !== 'task') return;

    const { filePath, options } = msg.payload;
    const { outputDir, clearOutputDir, chunkSizeMB } = options;

    try {
      // Stream the input CSV and write chunk files asynchronously.
      await chunkOneCsvFile({
        filePath,
        outputDir,
        clearOutputDir,
        chunkSizeMB,
        // Propagate incremental progress to the parent.
        onProgress: (processed, total) =>
          process.send?.({
            type: 'progress',
            payload: { filePath, processed, total },
          }),
      });

      // Report success to the parent.
      process.send?.({
        type: 'result',
        payload: { ok: true, filePath },
      });
    } catch (err) {
      // Log locally and report failure upstream; exit the worker with error code.
      const message = extractErrorMessage(err);
      logger.error(`[w${workerId}] ERROR ${filePath}: ${message}`);
      process.send?.({
        type: 'result',
        payload: { ok: false, filePath, error: message },
      });
    }
  });

  // keep alive
  await new Promise<never>(() => {
    // This promise never resolves, keeping the worker alive indefinitely
    // until the parent process instructs shutdown.
  });
}
