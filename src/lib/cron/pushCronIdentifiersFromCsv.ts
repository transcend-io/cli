import Bluebird from 'bluebird';
import { chunk } from 'lodash-es';
import { createSombraGotInstance } from '../graphql';
import colors from 'colors';
import {
  markCronIdentifierCompleted,
  CronIdentifierPush,
} from './markCronIdentifierCompleted';
import cliProgress from 'cli-progress';
import { logger } from '../../logger';
import { readCsv } from '../requests';
import { DEFAULT_TRANSCEND_API } from '../../constants';

const { map, mapSeries } = Bluebird;

/**
 * Given a CSV of cron job outputs, mark all requests as completed in Transcend
 *
 * @param options - Options
 * @returns Number of items marked as completed
 */
export async function pushCronIdentifiersFromCsv({
  file,
  dataSiloId,
  auth,
  sombraAuth,
  concurrency = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
  sleepSeconds = 10,
}: {
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Data Silo ID to pull down jobs for */
  dataSiloId: string;
  /** Upload concurrency */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Sleep time in seconds between chunks of concurrent calls */
  sleepSeconds?: number;
}): Promise<number> {
  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Read from CSV
  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const activeResults = readCsv(file, CronIdentifierPush);

  // Notify Transcend
  logger.info(
    colors.magenta(
      `Notifying Transcend for data silo "${dataSiloId}" marking "${activeResults.length}" identifiers as completed.`,
    ),
  );

  // Time duration
  const t0 = new Date().getTime();
  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  let successCount = 0;
  let failureCount = 0;
  let errorCount = 0;
  progressBar.start(activeResults.length, 0);

  // Process in chunks with sleep intervals
  const chunks = chunk(activeResults, concurrency);
  const totalChunks = chunks.length;
  const processChunk = async (
    items: CronIdentifierPush[],
    chunkIndex: number,
  ): Promise<void> => {
    logger.info(
      colors.blue(
        `Processing chunk ${chunkIndex + 1}/${totalChunks} (${
          chunk.length
        } items)`,
      ),
    );

    // Process the items of the chunk concurrently
    await map(items, async (identifier) => {
      try {
        const success = await markCronIdentifierCompleted(sombra, identifier);
        if (success) {
          successCount += 1;
        } else {
          failureCount += 1;
        }
      } catch (e) {
        logger.error(
          colors.red(
            `Error notifying Transcend for identifier "${identifier.identifier}" - ${e?.message}`,
          ),
        );
        errorCount += 1;
      }
      progressBar.update(successCount + failureCount);
    });

    // Sleep between chunks (except for the last chunk)
    if (sleepSeconds > 0 && chunkIndex < totalChunks - 1) {
      logger.info(
        colors.yellow(`Sleeping for ${sleepSeconds}s before next chunk...`),
      );

      await new Promise((resolve) => {
        setTimeout(resolve, sleepSeconds * 1000);
      });
    }
  };

  // Process all chunks sequentially
  await mapSeries(chunks, processChunk);

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully notified Transcend for ${successCount} identifiers in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );
  if (failureCount) {
    logger.info(
      colors.magenta(
        `There were ${failureCount} identifiers that were not in a state to be updated.` +
          'They likely have already been resolved.',
      ),
    );
  }
  if (errorCount) {
    logger.error(
      colors.red(
        `There were ${errorCount} identifiers that failed to be updated. Please review the logs for more information.`,
      ),
    );
    throw new Error('Failed to update all identifiers');
  }
  return activeResults.length;
}
