import {
  RequestAction,
  RequestEnricherStatus,
  RequestStatus,
} from '@transcend-io/privacy-types';
import cliProgress from 'cli-progress';
import colors from 'colors';
import { difference } from 'lodash-es';
import { DEFAULT_TRANSCEND_API } from '../../constants';
import { logger } from '../../logger';
import { map } from '../bluebird-replace';
import {
  buildTranscendGraphQLClient,
  fetchAllRequestEnrichers,
  fetchAllRequests,
  retryRequestEnricher,
} from '../graphql';

/**
 * Restart a bunch of request enrichers
 *
 * @param options - Options
 */
export async function bulkRetryEnrichers({
  auth,
  requestActions = [],
  createdAtBefore,
  createdAtAfter,
  transcendUrl = DEFAULT_TRANSCEND_API,
  requestEnricherStatuses = Object.values(RequestEnricherStatus),
  requestIds = [],
  enricherId,
  concurrency = 20,
}: {
  /** Actions to filter for */
  requestActions?: RequestAction[];
  /** Request enricher statuses to restart - defaults to all statuses */
  requestEnricherStatuses?: RequestEnricherStatus[];
  /** Transcend API key authentication */
  auth: string;
  /** The ID of the enricher to restart */
  enricherId: string;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Request IDs to filter for */
  requestIds?: string[];
  /** Filter for requests created before this date */
  createdAtBefore?: Date;
  /** Filter for requests created after this date */
  createdAtAfter?: Date;
  /** Concurrency to upload requests at */
  concurrency?: number;
}): Promise<void> {
  // Time duration
  const t0 = Date.now();
  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  logger.info(colors.magenta('Fetching requests to restart...'));

  const requests = await fetchAllRequests(client, {
    actions: requestActions,
    statuses: [RequestStatus.Enriching],
    createdAtBefore,
    createdAtAfter,
    requestIds,
  });

  let totalRestarted = 0;

  // Validate request IDs
  if (requestIds.length > 0 && requestIds.length !== requests.length) {
    const missingRequests = difference(
      requestIds,
      requests.map(({ id }) => id),
    );
    if (missingRequests.length > 0) {
      throw new Error(
        `Failed to find the following requests by ID: ${missingRequests.join(
          ',',
        )}.`,
      );
    }
  }

  // Map over the requests
  let total = 0;
  progressBar.start(requests.length, 0);
  await map(
    requests,
    async (request) => {
      // Pull the request identifiers
      const requestEnrichers = await fetchAllRequestEnrichers(client, {
        requestId: request.id,
      });
      const requestEnrichersToRestart = requestEnrichers.filter(
        (requestEnricher) =>
          requestEnricher.enricher.id === enricherId &&
          requestEnricherStatuses.includes(requestEnricher.status),
      );
      await map(requestEnrichersToRestart, async (requestEnricher) => {
        await retryRequestEnricher(client, requestEnricher.id);
        totalRestarted += 1;
      });

      // Cache successful upload
      total += 1;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = Date.now();
  const totalTime = t1 - t0;

  // Log completion time
  logger.info(
    colors.green(
      `Completed restarting of ${requests.length.toLocaleString()} requests and ${totalRestarted.toLocaleString()} enrichers in "${(
        totalTime / 1000
      ).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}" seconds.`,
    ),
  );
}
