import {
  RequestAction,
  RequestEnricherStatus,
  RequestStatus,
} from '@transcend-io/privacy-types';
import { map } from '../bluebird';
import cliProgress from 'cli-progress';
import colors from 'colors';
import { difference } from 'lodash-es';
import { DEFAULT_TRANSCEND_API } from '../../constants';
import {
  buildTranscendGraphQLClient,
  fetchAllRequestEnrichers,
  fetchAllRequests,
  retryRequestEnricher,
} from '../graphql';
import { logger } from '../../logger';

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
  updatedAtBefore,
  updatedAtAfter,
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
  /** Filter for requests updated before this date */
  updatedAtBefore?: Date;
  /** Filter for requests updated after this date */
  updatedAtAfter?: Date;
  /** Concurrency to upload requests at */
  concurrency?: number;
}): Promise<void> {
  // Time duration
  const t0 = new Date().getTime();
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
    updatedAtBefore,
    updatedAtAfter,
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
      logger.error(
        colors.red(
          `Failed to find the following requests by ID: ${missingRequests.join(
            ',',
          )}.`,
        ),
      );
      process.exit(1);
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
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  // Log completion time
  logger.info(
    colors.green(
      `Completed restarting of ${
        requests.length
      } requests and ${totalRestarted} enrichers in "${
        totalTime / 1000
      }" seconds.`,
    ),
  );
}
