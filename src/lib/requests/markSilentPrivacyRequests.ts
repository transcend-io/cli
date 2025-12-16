import { map } from 'bluebird';
import colors from 'colors';
import { logger } from '../../logger';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import {
  UPDATE_PRIVACY_REQUEST,
  fetchAllRequests,
  makeGraphQLRequest,
  buildTranscendGraphQLClient,
} from '../graphql';
import cliProgress from 'cli-progress';
import { DEFAULT_TRANSCEND_API } from '../../constants';

/**
 * Mark a set of privacy requests to be in silent mode
 *
 * @param options - Options
 * @returns The number of requests marked silent
 */
export async function markSilentPrivacyRequests({
  requestActions,
  auth,
  requestIds,
  statuses = [
    RequestStatus.Compiling,
    RequestStatus.RequestMade,
    RequestStatus.Delayed,
    RequestStatus.Approving,
    RequestStatus.Secondary,
    RequestStatus.Enriching,
    RequestStatus.Waiting,
    RequestStatus.SecondaryApproving,
  ],
  createdAtAfter,
  createdAtBefore,
  concurrency = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The request actions that should be restarted */
  requestActions: RequestAction[];
  /** Transcend API key authentication */
  auth: string;
  /** Concurrency limit for approving */
  concurrency?: number;
  /** The request statuses to mark silent */
  statuses?: RequestStatus[];
  /** The set of privacy requests to mark silent */
  requestIds?: string[];
  /** Filter for requests created before this date */
  createdAtBefore?: Date;
  /** Filter for requests created after this date */
  createdAtAfter?: Date;
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
    statuses,
    createdAtBefore,
    createdAtAfter,
    isSilent: false,
    requestIds,
  });

  // Notify Transcend
  logger.info(
    colors.magenta(`Marking "${allRequests.length}" as silent mode.`),
  );

  let total = 0;
  progressBar.start(allRequests.length, 0);
  await map(
    allRequests,
    async (requestToMarkSilent) => {
      await makeGraphQLRequest(client, UPDATE_PRIVACY_REQUEST, {
        input: {
          id: requestToMarkSilent.id,
          isSilent: true,
        },
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
      `Successfully marked ${total} requests as silent mode in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );
  return allRequests.length;
}
