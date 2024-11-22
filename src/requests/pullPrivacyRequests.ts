import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { map } from 'bluebird';
import colors from 'colors';
import groupBy from 'lodash/groupBy';

import { DEFAULT_TRANSCEND_API } from '../constants';
import {
  PrivacyRequest,
  RequestIdentifier,
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllRequestIdentifiers,
  fetchAllRequests,
} from '../graphql';
import { logger } from '../logger';

export interface ExportedPrivacyRequest extends PrivacyRequest {
  /** Request identifiers */
  requestIdentifiers: RequestIdentifier[];
}

/**
 * Pull down a list of privacy requests
 *
 * @param options - Options
 */
export async function pullPrivacyRequests({
  auth,
  sombraAuth,
  actions = [],
  statuses = [],
  pageLimit = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
  createdAtBefore,
  createdAtAfter,
  isTest,
}: {
  /** Transcend API key authentication */
  auth: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
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
  isTest?: boolean;
}): Promise<{
  /** All request information with attached identifiers */
  requestsWithRequestIdentifiers: ExportedPrivacyRequest[];
  /** Requests that are formatted for CSV */
  requestsFormattedForCsv: {
    [k in string]: string | null | number | boolean;
  }[];
}> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

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
          ? `Pulling requests of type "${actions.join('" , "')}"`
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
    isTest,
  });

  // Fetch the request identifiers for those requests
  const requestsWithRequestIdentifiers = await map(
    requests,
    async (request) => {
      const requestIdentifiers = await fetchAllRequestIdentifiers(
        client,
        sombra,
        {
          requestId: request.id,
        },
      );
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

  return { requestsWithRequestIdentifiers, requestsFormattedForCsv: data };
}
