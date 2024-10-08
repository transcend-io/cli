import { map } from 'bluebird';
import colors from 'colors';
import { logger } from '../logger';
import {
  RequestAction,
  RequestOrigin,
  RequestStatus,
} from '@transcend-io/privacy-types';
import {
  UPDATE_PRIVACY_REQUEST,
  fetchAllRequests,
  makeGraphQLRequest,
  buildTranscendGraphQLClient,
  APPROVE_PRIVACY_REQUEST,
} from '../graphql';
import cliProgress from 'cli-progress';
import { DEFAULT_TRANSCEND_API } from '../constants';

/**
 * Approve a set of privacy requests
 *
 * @param options - Options
 * @returns The number of requests approved
 */
export async function approvePrivacyRequests({
  requestActions,
  requestOrigins,
  auth,
  silentModeBefore,
  createdAtAfter,
  createdAtBefore,
  concurrency = 50,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The request actions that should be restarted */
  requestActions: RequestAction[];
  /** The request origins that should be restarted */
  requestOrigins?: RequestOrigin[];
  /** Transcend API key authentication */
  auth: string;
  /** Concurrency limit for approving */
  concurrency?: number;
  /** Mark these requests as silent mode if they were created before this date */
  silentModeBefore?: Date;
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
    statuses: [RequestStatus.Approving],
    createdAtAfter,
    origins: requestOrigins,
    createdAtBefore,
  });

  // Notify Transcend
  logger.info(colors.magenta(`Approving "${allRequests.length}" requests.`));

  let total = 0;
  progressBar.start(allRequests.length, 0);
  await map(
    allRequests,
    async (requestToApprove) => {
      // update request to silent mode if silentModeBefore is defined
      // and the request was created before silentModeBefore
      if (
        silentModeBefore &&
        new Date(silentModeBefore) > new Date(requestToApprove.createdAt)
      ) {
        await makeGraphQLRequest(client, UPDATE_PRIVACY_REQUEST, {
          input: {
            id: requestToApprove.id,
            isSilent: true,
          },
        });
      }

      // approve the request
      await makeGraphQLRequest(client, APPROVE_PRIVACY_REQUEST, {
        input: { requestId: requestToApprove.id },
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
      `Successfully approved ${total} requests in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );
  return allRequests.length;
}
