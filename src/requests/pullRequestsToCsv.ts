import {
  buildTranscendGraphQLClient,
  fetchAllRequests,
  RequestIdentifier,
  PrivacyRequest,
  fetchAllRequestIdentifiers,
} from '../graphql';
import colors from 'colors';
import { map } from 'bluebird';
import uniq from 'lodash/uniq';
import groupBy from 'lodash/groupBy';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { writeCsv } from '../cron/writeCsv';
import { logger } from '../logger';

export interface ExportedPrivacyRequest extends PrivacyRequest {
  /** Request identifiers */
  requestIdentifiers: RequestIdentifier[];
}

/**
 * Pull the set of cron job requests to CSV
 *
 * @param options - Options
 */
export async function pullRequestsToCsv({
  file,
  auth,
  actions = [],
  statuses = [],
  pageLimit = 100,
  transcendUrl = 'https://api.transcend.io',
  createdAtBefore,
  createdAtAfter,
  showTests,
}: {
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Statuses to filter on */
  statuses?: RequestStatus[];
  /** The request action to fetch */
  actions?: RequestAction[];
  /** Page limit when fetching requests */
  pageLimit?: number;
  /** Filter for requests created before this date */
  createdAtBefore?: Date;
  /** Filter for requests created after this date */
  createdAtAfter?: Date;
  /** Return test requests */
  showTests?: boolean;
}): Promise<ExportedPrivacyRequest[]> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Log date range
  let dateRange = '';
  if (createdAtBefore) {
    dateRange += ` before ${createdAtBefore.toISOString()}`;
  }
  if (createdAtAfter) {
    dateRange += `${
      dateRange ? ', and' : ''
    } after ${createdAtAfter.toISOString()}`;
  }

  // Log out
  logger.info(
    colors.magenta(
      `${
        actions.length > 0
          ? `Pulling requests of type "${actions.join(',')}"`
          : 'Pulling all requests'
      }${dateRange}`,
    ),
  );

  // fetch the requests
  const requests = await fetchAllRequests(client, {
    actions,
    statuses,
    createdAtBefore,
    createdAtAfter,
    showTests,
  });

  // Fetch the request identifiers for those requests
  const requestsWithRequestIdentifiers = await map(
    requests,
    async (request) => {
      const requestIdentifiers = await fetchAllRequestIdentifiers(client, {
        requestId: request.id,
      });
      return {
        ...request,
        requestIdentifiers,
      };
    },
    {
      concurrency: pageLimit,
    },
  );

  logger.info(
    colors.magenta(`Pulled ${requestsWithRequestIdentifiers.length} requests`),
  );

  // Write out to CSV
  const data = requestsWithRequestIdentifiers.map(
    ({
      attributeValues,
      requestIdentifiers,
      id,
      email,
      type,
      status,
      subjectType,
      details,
      createdAt,
      country,
      locale,
      origin,
      countrySubDivision,
      isSilent,
      isTest,
      coreIdentifier,
      ...request
    }) => ({
      'Request ID': id,
      'Created At': createdAt,
      Email: email,
      'Core Identifier': coreIdentifier,
      'Request Type': type,
      'Data Subject Type': subjectType,
      Status: status,
      Country: country,
      'Country Sub Division': countrySubDivision,
      Details: details,
      Origin: origin,
      'Silent Mode': isSilent,
      'Is Test Request': isTest,
      Language: locale,
      ...request,
      ...Object.entries(groupBy(attributeValues, 'attributeKey.name')).reduce(
        (acc, [name, values]) =>
          Object.assign(acc, {
            [name]: values.map(({ name }) => name).join(','),
          }),
        {},
      ),
      ...Object.entries(groupBy(requestIdentifiers, 'name')).reduce(
        (acc, [name, values]) =>
          Object.assign(acc, {
            [name]: values.map(({ value }) => value).join(','),
          }),
        {},
      ),
    }),
  );
  const headers = uniq(data.map((d) => Object.keys(d)).flat());
  writeCsv(file, data, headers);

  logger.info(
    colors.green(
      `Successfully wrote ${requests.length} requests to file "${file}"`,
    ),
  );

  return requestsWithRequestIdentifiers;
}
