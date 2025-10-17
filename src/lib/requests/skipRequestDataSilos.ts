import { map } from 'bluebird';
import colors from 'colors';
import { logger } from '../../logger';
import {
  CHANGE_REQUEST_DATA_SILO_STATUS,
  makeGraphQLRequest,
  buildTranscendGraphQLClient,
  fetchRequestDataSilos,
  fetchRequestDataSilosCount,
} from '../graphql';
import cliProgress from 'cli-progress';
import { RequestStatus } from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from '../../constants';

/**
 * Given a data silo ID, mark all open request data silos as skipped
 *
 * @param options - Options
 * @returns Number of items skipped
 */
export async function skipRequestDataSilos({
  dataSiloId,
  auth,
  concurrency = 50,
  maxUploadPerChunk = 200000, // FIXME
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
  /** Maximum number of items to mark skipped per go */
  maxUploadPerChunk?: number;
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Time duration
  const t0 = new Date().getTime();

  // Determine total number of request data silos
  const requestDataSiloCount = await fetchRequestDataSilosCount(client, {
    dataSiloId,
    requestStatuses,
  });

  logger.info(
    colors.magenta(
      `Marking ${requestDataSiloCount} request data silos as completed`,
    ),
  );

  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  let total = 0;
  progressBar.start(requestDataSiloCount, 0);

  // fetch all RequestDataSilos that are open
  while (total < requestDataSiloCount) {
    const requestDataSilos = await fetchRequestDataSilos(client, {
      dataSiloId,
      requestStatuses,
      limit: maxUploadPerChunk,
      // eslint-disable-next-line no-loop-func
      onProgress: (numUpdated) => {
        total += numUpdated / 2;
        progressBar.update(total);
      },
    });

    await map(
      requestDataSilos,
      // eslint-disable-next-line no-loop-func
      async (requestDataSilo) => {
        // // FIXME
        // if (
        //   requestDataSilo.status === 'SKIPPED' ||
        //   requestDataSilo.status === 'RESOLVED'
        // ) {
        //   total += 0.5;
        //   progressBar.update(total);
        //   return;
        // }
        try {
          await makeGraphQLRequest<{
            /** Whether we successfully uploaded the results */
            success: boolean;
          }>(client, CHANGE_REQUEST_DATA_SILO_STATUS, {
            requestDataSiloId: requestDataSilo.id,
            status,
          });
        } catch (err) {
          if (!err.message.includes('Client error: Request must be active:')) {
            throw err;
          }
        }

        total += 0.5;
        progressBar.update(total);
      },
      { concurrency },
    );
  }

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully skipped  "${requestDataSiloCount}" requests in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );
  return requestDataSiloCount;
}
