import { RequestStatus } from '@transcend-io/privacy-types';
import cliProgress from 'cli-progress';
import colors from 'colors';
import { DEFAULT_TRANSCEND_API } from '../../constants';
import { logger } from '../../logger';
import { map } from '../bluebird-replace';
import {
  buildTranscendGraphQLClient,
  CHANGE_REQUEST_DATA_SILO_STATUS,
  fetchRequestDataSilos,
  makeGraphQLRequest,
} from '../graphql';

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
  status = 'SKIPPED',
  transcendUrl = DEFAULT_TRANSCEND_API,
  requestStatuses = [RequestStatus.Compiling, RequestStatus.Secondary],
}: {
  /** Transcend API key authentication */
  auth: string;
  /** Data Silo ID to pull down jobs for */
  dataSiloId: string;
  /** Status to set */
  status?: 'SKIPPED' | 'RESOLVED';
  /** Upload concurrency */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Request statuses to mark as completed */
  requestStatuses?: RequestStatus[];
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Time duration
  const t0 = Date.now();

  // fetch all RequestDataSilos that are open
  const requestDataSilos = await fetchRequestDataSilos(client, {
    dataSiloId,
    requestStatuses,
  });

  // Notify Transcend
  logger.info(
    colors.magenta(
      `Processing data silo: "${dataSiloId}" marking "${requestDataSilos.length.toLocaleString()}" requests as skipped.`,
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
          status,
        });
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes('Client error: Request must be active:')
        ) {
          throw error;
        }
      }

      total += 1;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = Date.now();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully skipped  "${requestDataSilos.length.toLocaleString()}" requests in "${(
        totalTime / 1000
      ).toLocaleString(undefined, { maximumFractionDigits: 2 })}" seconds!`,
    ),
  );
  return requestDataSilos.length;
}
