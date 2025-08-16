// runChild.ts
import { mkdirSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { uploadPreferenceManagementPreferencesInteractive } from '../../../lib/preference-management';
import { getFilePrefix } from './computeFiles';
import { splitCsvToList } from '../../../lib/requests';

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

  console.log(`[w${workerId}] ready pid=${process.pid}`);
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
        console.log(`[w${workerId}] START ${filePath}`);
        log(`START ${filePath}`);

        await uploadPreferenceManagementPreferencesInteractive({
          receiptFilepath,
          schemaFilePath: options.schemaFile,
          auth: options.auth,
          sombraAuth: options.sombraAuth,
          file: filePath,
          partition: options.partition,
          transcendUrl: options.transcendUrl,
          skipConflictUpdates: options.skipConflictUpdates,
          skipWorkflowTriggers: options.skipWorkflowTriggers,
          skipExistingRecordCheck: options.skipExistingRecordCheck,
          isSilent: options.isSilent,
          dryRun: options.dryRun,
          attributes: splitCsvToList(options.attributes),
          forceTriggerWorkflows: options.forceTriggerWorkflows,
          allowedIdentifierNames: options.allowedIdentifierNames,
          identifierColumns: options.identifierColumns,
          columnsToIgnore: options.columnsToIgnore || [],
        });

        console.log(`[w${workerId}] DONE  ${filePath}`);
        log(`SUCCESS ${filePath}`);
        process.send?.({ type: 'result', payload: { ok: true, filePath } });
      } catch (err: any) {
        const e = err?.stack || err?.message || String(err);
        console.error(
          `[w${workerId}] ERROR ${filePath}: ${err?.message || err}`,
        );
        log(`FAIL ${filePath}\n${e}`);
        process.send?.({
          type: 'result',
          payload: { ok: false, filePath, error: e },
        });
      }
    } else if (msg.type === 'shutdown') {
      console.log(`[w${workerId}] shutdown`);
      log('Shutting down.');
      logStream.end(() => process.exit(0));
    }
  });

  process.on('uncaughtException', (err) => {
    console.error(`[w${workerId}] uncaughtException: ${err?.stack || err}`);
    log(`uncaughtException\n${err?.stack || err}`);
    logStream.end(() => process.exit(1));
  });
  process.on('unhandledRejection', (reason) => {
    console.error(`[w${workerId}] unhandledRejection: ${String(reason)}`);
    log(`unhandledRejection\n${String(reason)}`);
    logStream.end(() => process.exit(1));
  });

  await new Promise<never>(() => {});
}
