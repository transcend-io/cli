import { mapSeries, map } from '../bluebird';
import colors from 'colors';
import { logger } from '../../logger';
import {
  makeGraphQLRequest,
  buildTranscendGraphQLClient,
  fetchAllRequestEnrichers,
  fetchAllRequests,
  SKIP_REQUEST_ENRICHER,
} from '../graphql';
import cliProgress from 'cli-progress';
import {
  RequestEnricherStatus,
  RequestStatus,
} from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from '../../constants';

/**
 * Given an enricher ID, mark all open request enrichers as skipped
 *
 * @param options - Options
 * @returns Number of items skipped
 */
export async function skipPreflightJobs({
  enricherIds,
  auth,
  concurrency = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** Transcend API key authentication */
  auth: string;
  /** Enricher IDs to pull down jobs for */
  enricherIds: string[];
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
  const t0 = new Date().getTime();

  // fetch all RequestDataSilos that are open
  const requests = await fetchAllRequests(client, {
    statuses: [RequestStatus.Enriching],
  });

  // Notify Transcend
  logger.info(
    colors.magenta(
      `Processing enricher: "${enricherIds.join(',')}" fetched "${
        requests.length
      }" in enriching status.`,
    ),
  );

  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  let total = 0;
  progressBar.start(requests.length, 0);
  let totalSkipped = 0;
  await map(
    requests,
    async (request) => {
      // TODO dont pull all in
      const requestEnrichers = await fetchAllRequestEnrichers(client, {
        requestId: request.id,
      });
      const requestEnrichersFiltered = requestEnrichers.filter(
        (enricher) =>
          enricherIds.includes(enricher.enricher.id) &&
          ![
            RequestEnricherStatus.Resolved,
            RequestEnricherStatus.Skipped,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ].includes(enricher.status as any),
      );

      // TODO
      if (requestEnrichersFiltered.length > 0) {
        await mapSeries(requestEnrichersFiltered, async (requestEnricher) => {
          try {
            await makeGraphQLRequest<{
              /** Whether we successfully uploaded the results */
              success: boolean;
            }>(client, SKIP_REQUEST_ENRICHER, {
              requestEnricherId: requestEnricher.id,
            });
            totalSkipped += 1;
          } catch (err) {
            if (
              !err.message.includes(
                'Client error: Cannot skip Request enricher because it has already completed',
              )
            ) {
              throw err;
            }
          }
        });
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
      `Successfully skipped "${totalSkipped}" for  "${
        requests.length
      }" requests in "${totalTime / 1000}" seconds!`,
    ),
  );
  return requests.length;
}
