import { map } from 'bluebird';
import colors from 'colors';
import { logger } from '../logger';
import { readCsv } from '../requests';
import {
  CHANGE_REQUEST_DATA_SILO_STATUS,
  fetchRequestDataSilo,
  makeGraphQLRequest,
  buildTranscendGraphQLClient,
} from '../graphql';
import * as t from 'io-ts';
import cliProgress from 'cli-progress';
import { DEFAULT_TRANSCEND_API } from '../constants';

const RequestIdRow = t.type({
  'Request Id': t.string,
});

/**
 * Given a CSV of Request IDs, mark associated RequestDataSilos as completed
 *
 * @param options - Options
 * @returns Number of items marked as completed
 */
export async function markRequestDataSiloIdsCompleted({
  file,
  dataSiloId,
  auth,
  concurrency = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
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
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Time duration
  const t0 = new Date().getTime();
  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // Read from CSV
  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const activeResults = readCsv(file, RequestIdRow);

  // Notify Transcend
  logger.info(
    colors.magenta(
      `Notifying Transcend for data silo "${dataSiloId}" marking "${activeResults.length}" requests as completed.`,
    ),
  );

  let total = 0;
  progressBar.start(activeResults.length, 0);
  await map(
    activeResults,
    async (identifier) => {
      const requestDataSilo = await fetchRequestDataSilo(client, {
        requestId: identifier['Request Id'],
        dataSiloId,
      });

      await makeGraphQLRequest<{
        /** Whether we successfully uploaded the results */
        success: boolean;
      }>(client, CHANGE_REQUEST_DATA_SILO_STATUS, {
        requestDataSiloId: requestDataSilo.id,
        status: 'RESOLVED',
      });

      total += 1;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully notified Transcend in "${totalTime / 1000}" seconds!`,
    ),
  );
  return activeResults.length;
}
