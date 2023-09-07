import { map } from 'bluebird';
import colors from 'colors';
import { logger } from '../logger';
import {
  CHANGE_REQUEST_DATA_SILO_STATUS,
  fetchRequestDataSilo,
  makeGraphQLRequest,
  buildTranscendGraphQLClient,
} from '../graphql';
import cliProgress from 'cli-progress';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { RequestDataSiloStatus } from '@transcend-io/privacy-types';

/**
 * Given a CSV of Request IDs, mark associated RequestDataSilos as completed
 *
 * @param options - Options
 * @returns Number of items marked as completed
 */
export async function markRequestDataSiloIdsCompleted({
  requestIds,
  dataSiloId,
  auth,
  concurrency = 100,
  status = RequestDataSiloStatus.Resolved,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The list of request ids to mark as completed  */
  requestIds: string[];
  /** Transcend API key authentication */
  auth: string;
  /** Data Silo ID to pull down jobs for */
  dataSiloId: string;
  /** Status to update requests to */
  status?: RequestDataSiloStatus;
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

  // Notify Transcend
  logger.info(
    colors.magenta(
      `Notifying Transcend for data silo "${dataSiloId}" marking "${requestIds.length}" requests as completed.`,
    ),
  );

  let total = 0;
  progressBar.start(requestIds.length, 0);
  await map(
    requestIds,
    async (requestId) => {
      const requestDataSilo = await fetchRequestDataSilo(client, {
        requestId,
        dataSiloId,
      });

      try {
        await makeGraphQLRequest<{
          /** Whether we successfully uploaded the results */
          success: boolean;
        }>(client, CHANGE_REQUEST_DATA_SILO_STATUS, {
          requestDataSiloId: requestDataSilo.id,
          status,
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
      `Successfully notified Transcend in "${totalTime / 1000}" seconds!`,
    ),
  );
  return requestIds.length;
}
