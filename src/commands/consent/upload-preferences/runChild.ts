// runChild.ts
import { mkdirSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { getFilePrefix } from './computeFiles';
import { splitCsvToList } from '../../../lib/requests';
import type { TaskCommonOpts } from './impl';
import { interactivePreferenceUploaderFromPlan } from './upload/interactivePreferenceUploaderFromPlan';
import { makeSchemaState } from './schemaState';
import { makeReceiptsState } from './receiptsState';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
} from '../../../lib/graphql';
import { logger } from '../../../logger';
import { buildInteractiveUploadPreferencePlan } from './upload/buildInteractiveUploadPlan';

export async function runChild(): Promise<void> {
  const workerId = Number(process.env.WORKER_ID || '0');
  const logFile =
    process.env.WORKER_LOG ||
    join(process.cwd(), `logs/worker-${workerId}.log`);
  mkdirSync(dirname(logFile), { recursive: true });

  const logStream = createWriteStream(logFile, { flags: 'a' });
  const log = (...args: unknown[]): void => {
    const line = `[w${workerId}] ${new Date().toISOString()} ${args
      .map((a) => String(a))
      .join(' ')}\n`;
    logStream.write(line);
  };

  logger.info(`[w${workerId}] ready pid=${process.pid}`);
  process.send?.({ type: 'ready' });

  process.on('message', async (msg: any) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'task') {
      const { filePath, options } = msg.payload as {
        filePath: string;
        options: TaskCommonOpts;
      };
      const receiptFilepath = join(
        options.receiptsFolder,
        `${getFilePrefix(filePath)}-receipts.json`,
      );
      try {
        mkdirSync(dirname(receiptFilepath), { recursive: true });
        logger.info(`[w${workerId}] START ${filePath}`);
        log(`START ${filePath}`);

        // Construct common options
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

        // Step 1: Build the plan (validation-only)
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

        // Step 2: Execute the upload (no parsing/validation here)
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
          onProgress: ({ successDelta, successTotal, fileTotal }) => {
            // Emit progress messages up to the parent
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

        logger.info(`[w${workerId}] DONE  ${filePath}`);
        log(`SUCCESS ${filePath}`);

        process.send?.({
          type: 'result',
          payload: { ok: true, filePath, receiptFilepath },
        });
      } catch (err: any) {
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
      logger.info(`[w${workerId}] shutdown`);
      log('Shutting down.');
      logStream.end(() => process.exit(0));
    }
  });

  process.on('uncaughtException', (err) => {
    logger.error(`[w${workerId}] uncaughtException: ${err?.stack || err}`);
    log(`uncaughtException\n${err?.stack || err}`);
    logStream.end(() => process.exit(1));
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(`[w${workerId}] unhandledRejection: ${String(reason)}`);
    log(`unhandledRejection\n${String(reason)}`);
    logStream.end(() => process.exit(1));
  });

  await new Promise<never>(() => {});
}
