import { map } from 'bluebird';
import { createSombraGotInstance } from '../graphql';
import colors from 'colors';
import {
  markCronIdentifierCompleted,
  CronIdentifierPush,
} from './markCronIdentifierCompleted';
import { logger } from '../logger';
import { readCsv } from '../requests';

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
  transcendUrl = 'https://api.transcend.io',
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
}): Promise<number> {
  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Read from CSV
  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const activeResults = readCsv(file, CronIdentifierPush);

  // Notify Transcend
  logger.info(
    colors.magenta(
      `Notifying Transcend for data silo "${dataSiloId}" marking "${activeResults.length}" requests as completed.`,
    ),
  );
  await map(
    activeResults,
    async (identifier) => {
      await markCronIdentifierCompleted(sombra, identifier);
    },
    { concurrency },
  );

  logger.info(colors.green('Successfully notified Transcend!'));
  return activeResults.length;
}
