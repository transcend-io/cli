import {
  buildTranscendGraphQLClient,
  RequestEnricher,
  fetchAllRequests,
  RequestIdentifier,
  PrivacyRequest,
  fetchAllRequestIdentifiers,
  fetchAllRequestEnrichers,
} from '../graphql';
import colors from 'colors';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import { map } from 'bluebird';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { writeCsv } from '../cron/writeCsv';
import { logger } from '../logger';
import { DEFAULT_TRANSCEND_API } from '../constants';

export interface PrivacyRequestWithIdentifiers extends PrivacyRequest {
  /** Request Enrichers */
  requestEnrichers: RequestEnricher[];
  /** Request Identifiers */
  requestIdentifiers: RequestIdentifier[];
}

/**
 * Pull the set of manual enrichment jobs to CSV
 *
 * @param options - Options
 */
export async function pullManualEnrichmentIdentifiersToCsv({
  file,
  auth,
  requestActions,
  concurrency = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Concurrency */
  concurrency?: number;
  /** The request actions to fetch */
  requestActions: RequestAction[];
  /** API URL for Transcend backend */
  transcendUrl?: string;
}): Promise<PrivacyRequestWithIdentifiers[]> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  logger.info(
    colors.magenta(
      `Pulling manual enrichment requests, filtered for actions: ${requestActions.join(
        ',',
      )}`,
    ),
  );

  // Pull all privacy requests
  const allRequests = await fetchAllRequests(client, {
    actions: requestActions,
    statuses: [RequestStatus.Enriching],
  });

  // Requests to save
  const savedRequests: PrivacyRequestWithIdentifiers[] = [];

  // Filter down requests to what is needed
  await map(
    allRequests,
    async (request) => {
      // Fetch enrichers
      const requestEnrichers = await fetchAllRequestEnrichers(client, {
        requestId: request.id,
      });

      // Check if manual enrichment exists for that request
      const hasManualEnrichment = requestEnrichers.filter(
        ({ status }) => status === 'ACTION_REQUIRED',
      );

      // Save request to queue
      if (hasManualEnrichment) {
        const requestIdentifiers = await fetchAllRequestIdentifiers(client, {
          requestId: request.id,
        });
        savedRequests.push({
          ...request,
          requestIdentifiers,
          requestEnrichers,
        });
      }
    },
    {
      concurrency,
    },
  );

  const data = savedRequests.map(
    ({
      attributeValues,
      requestIdentifiers,
      requestEnrichers, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...request
    }) => ({
      ...request,
      // flatten identifiers
      ...Object.entries(groupBy(requestIdentifiers, 'name')).reduce(
        (acc, [key, values]) =>
          Object.assign(acc, {
            [key]: values.map(({ value }) => value).join(','),
          }),
        {},
      ),
      // flatten attributes
      ...Object.entries(groupBy(attributeValues, 'attributeKey.name')).reduce(
        (acc, [key, values]) =>
          Object.assign(acc, {
            [key]: values.map(({ name }) => name).join(','),
          }),
        {},
      ),
    }),
  );

  // Write out to CSV
  const headers = uniq(data.map((d) => Object.keys(d)).flat());
  writeCsv(file, data, headers);

  logger.info(
    colors.green(
      `Successfully wrote ${savedRequests.length} requests to file "${file}"`,
    ),
  );

  return savedRequests;
}
