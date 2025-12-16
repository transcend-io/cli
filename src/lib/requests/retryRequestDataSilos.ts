import Bluebird from 'bluebird';
const { map } = Bluebird;
import colors from 'colors';
import { logger } from '../../logger';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import {
  RETRY_REQUEST_DATA_SILO,
  fetchRequestDataSilo,
  fetchAllRequests,
  makeGraphQLRequest,
  buildTranscendGraphQLClient,
} from '../graphql';
import cliProgress from 'cli-progress';
import { DEFAULT_TRANSCEND_API } from '../../constants';

/**
 * Retry a set of RequestDataSilos
 *
 * @param options - Options
 * @returns Number of items marked as completed
 */
export async function retryRequestDataSilos({
  requestActions,
  dataSiloId,
  auth,
  concurrency = 20,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The request actions that should be restarted */
  requestActions: RequestAction[];
  /** Transcend API key authentication */
  auth: string;
  /** Data Silo ID to pull down jobs for */
  dataSiloId: string;
  /** Concurrency to upload requests in parallel */
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

  // Pull in the requests
  const allRequests = await fetchAllRequests(client, {
    actions: requestActions,
    statuses: [RequestStatus.Compiling, RequestStatus.Approving],
  });

  // Notify Transcend
  logger.info(
    colors.magenta(
      `Retrying requests for Data Silo: "${dataSiloId}", restarting "${allRequests.length}" requests.`,
    ),
  );

  let total = 0;
  let skipped = 0;
  progressBar.start(allRequests.length, 0);
  await map(
    allRequests,
    async (requestToRestart) => {
      try {
        const requestDataSilo = await fetchRequestDataSilo(client, {
          requestId: requestToRestart.id,
          dataSiloId,
        });

        await makeGraphQLRequest<{
          /** Whether we successfully uploaded the results */
          success: boolean;
        }>(client, RETRY_REQUEST_DATA_SILO, {
          requestDataSiloId: requestDataSilo.id,
        });
      } catch (err) {
        // some requests may not have this data silo connected
        if (!err.message.includes('Failed to find RequestDataSilo')) {
          throw err;
        }
        skipped += 1;
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
      `Successfully notified Transcend in "${
        totalTime / 1000
      }" seconds for ${total} requests, ${skipped} requests were skipped because data silo was not attached to the request!`,
    ),
  );
  return allRequests.length;
}
