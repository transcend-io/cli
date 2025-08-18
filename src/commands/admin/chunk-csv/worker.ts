import { chunkOneCsvFile } from '../../../lib/helpers/chunkOneCsvFile';
import { logger } from '../../../logger';

/**
 * Parent → Worker task message.
 * Instructs this worker to chunk a single CSV file according to the provided options.
 */
type TaskMsg = {
  type: 'task';
  payload: {
    /** Absolute or relative path to the CSV file this worker should process. */
    filePath: string;
    options: {
      /**
       * Optional directory where chunk files are written.
       * If omitted, chunks are written next to the input file.
       */
      outputDir?: string;
      /**
       * When true, any existing files matching this input’s chunk filename pattern
       * (e.g. `${base}_chunk_0001.csv`) are deleted before writing.
       */
      clearOutputDir: boolean;
      /**
       * Target chunk size in megabytes. This is an approximate threshold used to
       * roll to the next output file while streaming.
       */
      chunkSizeMB: number;
    };
  };
};

/** Parent → Worker shutdown message. Signals the worker to exit cleanly. */
type ShutdownMsg = { type: 'shutdown' };

/** Union of messages the worker can receive from the parent process. */
type ParentMsg = TaskMsg | ShutdownMsg;

/**
 * Worker → Parent progress message.
 * Emitted periodically (and finally) as rows are processed from the input file.
 */
type ProgressMsg = {
  type: 'progress';
  payload: {
    /** Path of the file currently being processed (echoed back for easy correlation). */
    filePath: string;
    /** Number of data rows processed so far (header not counted). */
    processed: number;
    /** Optional total row count if known (usually undefined for streaming). */
    total?: number;
  };
};

/**
 * Worker → Parent result message.
 * Emitted once per task upon success or failure.
 */
type ResultMsg = {
  type: 'result';
  payload: {
    /** Whether the task completed successfully. */
    ok: boolean;
    /** Path of the file that was processed. */
    filePath: string;
    /** Error string when ok === false. */
    error?: string;
  };
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
  process.on('message', async (msg: ParentMsg) => {
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
          } as ProgressMsg),
      });

      // Report success to the parent.
      process.send?.({
        type: 'result',
        payload: { ok: true, filePath },
      } as ResultMsg);
    } catch (err) {
      // Log locally and report failure upstream; exit the worker with error code.
      const message = (err as Error)?.message ?? String(err);
      logger.error(`[w${workerId}] ERROR ${filePath}: ${message}`);
      process.send?.({
        type: 'result',
        payload: { ok: false, filePath, error: String(err) },
      } as ResultMsg);
      process.exit(1);
    }
  });

  // keep alive
  await new Promise<never>(() => {
    // This promise never resolves, keeping the worker alive indefinitely
    // until the parent process instructs shutdown.
  });
}
