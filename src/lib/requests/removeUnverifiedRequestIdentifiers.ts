import Bluebird from 'bluebird';
import colors from 'colors';
import { logger } from '../../logger';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import {
  REMOVE_REQUEST_IDENTIFIERS,
  fetchAllRequests,
  fetchAllRequestIdentifierMetadata,
  makeGraphQLRequest,
  buildTranscendGraphQLClient,
} from '../graphql';
import cliProgress from 'cli-progress';
import { DEFAULT_TRANSCEND_API } from '../../constants';

const { map } = Bluebird;

/**
 * Remove a set of unverified request identifier
 *
 * @param options - Options
 * @returns Number of items marked as completed
 */
export async function removeUnverifiedRequestIdentifiers({
  requestActions,
  identifierNames,
  auth,
  concurrency = 20,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The request actions that should be restarted */
  requestActions: RequestAction[];
  /** Transcend API key authentication */
  auth: string;
  /** The set of identifier names to remove */
  identifierNames: string[];
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
    statuses: [RequestStatus.Enriching],
  });

  // Notify Transcend
  logger.info(colors.magenta('Fetched requests in preflight/enriching state.'));

  let total = 0;
  let processed = 0;
  progressBar.start(allRequests.length, 0);
  await map(
    allRequests,
    async (requestToRestart) => {
      const requestIdentifiers = await fetchAllRequestIdentifierMetadata(
        client,
        { requestId: requestToRestart.id },
      );
      const clearOut = requestIdentifiers
        .filter(
          ({ isVerifiedAtLeastOnce, name }) =>
            isVerifiedAtLeastOnce === false && identifierNames.includes(name),
        )
        .map(({ id }) => id);

      if (clearOut.length > 0) {
        await makeGraphQLRequest<{
          /** Whether we successfully uploaded the results */
          success: boolean;
        }>(client, REMOVE_REQUEST_IDENTIFIERS, {
          input: {
            requestId: requestToRestart.id,
            requestIdentifierIds: clearOut,
          },
        });
        processed += clearOut.length;
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
      `Successfully cleared out unverified identifiers "${
        totalTime / 1000
      }" seconds for ${total} requests, ${processed} identifiers were cleared out!`,
    ),
  );
  return allRequests.length;
}
