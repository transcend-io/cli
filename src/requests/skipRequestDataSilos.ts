import { map } from 'bluebird';
import colors from 'colors';
import { logger } from '../logger';
import {
  CHANGE_REQUEST_DATA_SILO_STATUS,
  makeGraphQLRequest,
  buildTranscendGraphQLClient,
  fetchRequestDataSilos,
} from '../graphql';
import cliProgress from 'cli-progress';
import { RequestStatus } from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from '../constants';

/**
 * Given a data silo ID, mark all open request data silos as skipped
 *
 * @param options - Options
 * @returns Number of items skipped
 */
export async function skipRequestDataSilos({
  dataSiloId,
  auth,
  concurrency = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
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

  // fetch all RequestDataSilos that are open
  const requestDataSilos = await fetchRequestDataSilos(client, {
    dataSiloId,
    requestStatuses: [RequestStatus.Compiling, RequestStatus.Secondary],
  });

  // Notify Transcend
  logger.info(
    colors.magenta(
      `Processing data silo: "${dataSiloId}" marking "${requestDataSilos.length}" requests as skipped.`,
    ),
  );

  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  let total = 0;
  progressBar.start(requestDataSilos.length, 0);
  await map(
    requestDataSilos,
    async (requestDataSilo) => {
      try {
        await makeGraphQLRequest<{
          /** Whether we successfully uploaded the results */
          success: boolean;
        }>(client, CHANGE_REQUEST_DATA_SILO_STATUS, {
          requestDataSiloId: requestDataSilo.id,
          status: 'SKIPPED',
        });
      } catch (err) {
        if (!err.message.include('Client error: Request must be active:')) {
          throw err;
        }
      }

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
      `Successfully skipped  "${requestDataSilos.length}" requests in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );
  return requestDataSilos.length;
}
