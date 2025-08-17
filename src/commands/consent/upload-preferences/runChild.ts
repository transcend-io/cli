import { mkdirSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { getFilePrefix } from './computeFiles';
import { splitCsvToList } from '../../../lib/requests';
import { interactivePreferenceUploaderFromPlan } from './upload/interactivePreferenceUploaderFromPlan';
import { makeSchemaState } from './schemaState';
import { makeReceiptsState } from './receipts/receiptsState';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
} from '../../../lib/graphql';
import { logger } from '../../../logger';
import { buildInteractiveUploadPreferencePlan } from './upload/buildInteractiveUploadPlan';
import type { TaskCommonOpts } from './buildTaskOptions';

export interface TaskMessage {
  type: 'task';
  payload: {
    filePath: string;
    options: TaskCommonOpts;
  };
}

export interface ShutdownMessage {
  type: 'shutdown';
}

export type ParentMessage = TaskMessage | ShutdownMessage;

/**
 * Run the child process for handling upload preferences.
 * This runs in a separate CPU if possible
 */
export async function runChild(): Promise<void> {
  // Get worker ID from environment or default to 0
  const workerId = Number(process.env.WORKER_ID || '0');

  // Determine log file path from environment or default location
  const logFile =
    process.env.WORKER_LOG ||
    join(process.cwd(), `logs/worker-${workerId}.log`);
  mkdirSync(dirname(logFile), { recursive: true });

  // Create a writable stream for logging
  const logStream = createWriteStream(logFile, { flags: 'a' });

  // Helper function to write logs with timestamp and worker ID
  const log = (...args: unknown[]): void => {
    const line = `[w${workerId}] ${new Date().toISOString()} ${args
      .map((a) => String(a))
      .join(' ')}\n`;
    logStream.write(line);
  };

  // Log that the worker is ready and send a ready message to parent
  logger.info(`[w${workerId}] ready pid=${process.pid}`);
  process.send?.({ type: 'ready' });

  // Listen for messages from the parent process
  process.on('message', async (msg: ParentMessage) => {
    if (!msg || typeof msg !== 'object') return;

    // Handle 'task' messages to process a file
    if (msg.type === 'task') {
      const { filePath, options } = msg.payload as {
        filePath: string;
        options: TaskCommonOpts;
      };
      // Compute the path for receipts file
      const receiptFilepath = join(
        options.receiptsFolder,
        `${getFilePrefix(filePath)}-receipts.json`,
      );
      try {
        // Ensure receipts directory exists
        mkdirSync(dirname(receiptFilepath), { recursive: true });
        logger.info(`[w${workerId}] START ${filePath}`);
        log(`START ${filePath}`);

        // Construct common state objects for the task
        const receipts = makeReceiptsState(receiptFilepath);
        const schema = await makeSchemaState(options.schemaFile);
        const client = buildTranscendGraphQLClient(
          options.transcendUrl,
          options.auth,
        );
        const sombra = await createSombraGotInstance(
          options.transcendUrl,
          options.auth,
          options.sombraAuth,
        );

        // Step 1: Build the upload plan (validation-only)
        const plan = await buildInteractiveUploadPreferencePlan({
          sombra,
          client,
          file: filePath,
          partition: options.partition,
          receipts,
          schema,
          skipExistingRecordCheck: options.skipExistingRecordCheck,
          forceTriggerWorkflows: options.forceTriggerWorkflows,
          allowedIdentifierNames: options.allowedIdentifierNames,
          maxRecordsToReceipt: options.maxRecordsToReceipt,
          identifierColumns: options.identifierColumns,
          columnsToIgnore: options.columnsToIgnore,
          attributes: splitCsvToList(options.attributes),
        });

        // Step 2: Execute the upload using the plan
        await interactivePreferenceUploaderFromPlan(plan, {
          receipts,
          sombra,
          dryRun: options.dryRun,
          isSilent: options.isSilent,
          skipWorkflowTriggers: options.skipWorkflowTriggers,
          skipConflictUpdates: options.skipConflictUpdates,
          forceTriggerWorkflows: options.forceTriggerWorkflows,
          uploadLogInterval: options.uploadLogInterval,
          maxChunkSize: options.maxChunkSize,
          uploadConcurrency: options.uploadConcurrency,
          maxRecordsToReceipt: options.maxRecordsToReceipt,
          // Report progress to parent process
          onProgress: ({ successDelta, successTotal, fileTotal }) => {
            process.send?.({
              type: 'progress',
              payload: {
                filePath,
                successDelta,
                successTotal,
                fileTotal,
              },
            });
          },
        });

        // Log completion and send result to parent
        logger.info(`[w${workerId}] DONE  ${filePath}`);
        log(`SUCCESS ${filePath}`);

        process.send?.({
          type: 'result',
          payload: { ok: true, filePath, receiptFilepath },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        // Handle errors, log them, and send failure result to parent
        const e = err?.stack || err?.message || String(err);
        logger.error(
          `[w${workerId}] ERROR ${filePath}: ${err?.message || err}\n\n${e}`,
        );
        log(`FAIL ${filePath}\n${e}`);
        process.send?.({
          type: 'result',
          payload: { ok: false, filePath, error: e, receiptFilepath },
        });
        process.exit(1);
      }
    } else if (msg.type === 'shutdown') {
      // Handle shutdown message: log and exit gracefully
      logger.info(`[w${workerId}] shutdown`);
      log('Shutting down.');
      logStream.end(() => process.exit(0));
    }
  });

  // Handle uncaught exceptions: log and exit
  process.on('uncaughtException', (err) => {
    logger.error(`[w${workerId}] uncaughtException: ${err?.stack || err}`);
    log(`uncaughtException\n${err?.stack || err}`);
    logStream.end(() => process.exit(1));
  });
  // Handle unhandled promise rejections: log and exit
  process.on('unhandledRejection', (reason) => {
    logger.error(`[w${workerId}] unhandledRejection: ${String(reason)}`);
    log(`unhandledRejection\n${String(reason)}`);
    logStream.end(() => process.exit(1));
  });

  // Keep the process alive indefinitely
  await new Promise<never>(() => {
    // Keep the process alive
  });
}
