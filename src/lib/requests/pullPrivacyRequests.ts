import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { map } from '../bluebird';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants';
import {
  RequestIdentifier,
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllRequestIdentifiers,
  fetchAllRequests,
  validateSombraVersion,
} from '../graphql';
import { logger } from '../../logger';
import {
  formatRequestForCsv,
  CsvRow,
  ExportedPrivacyRequest,
} from './formatRequestForCsv';
import { splitDateRange } from './splitDateRange';

/**
 * Pull down a list of privacy requests
 *
 * @param options - Options
 * @returns The requests with request identifiers and requests formatted for CSV
 */
export async function pullPrivacyRequests({
  auth,
  sombraAuth,
  actions = [],
  statuses = [],
  identifierSearch,
  pageLimit = 100,
  concurrency = 1,
  transcendUrl = DEFAULT_TRANSCEND_API,
  createdAtBefore,
  skipRequestIdentifiers = false,
  createdAtAfter,
  updatedAtBefore,
  updatedAtAfter,
  isTest,
}: {
  /** Transcend API key authentication */
  auth: string;
  /** Search for a specific identifier */
  identifierSearch?: string;
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
  /** Number of parallel date-range chunks */
  concurrency?: number;
  /** Filter for requests created before this date */
  createdAtBefore?: Date;
  /** Filter for requests created after this date */
  createdAtAfter?: Date;
  /** Filter for requests updated before this date */
  updatedAtBefore?: Date;
  /** Filter for requests updated after this date */
  updatedAtAfter?: Date;
  /** Return test requests */
  isTest?: boolean;
  /** Skip fetching request identifier */
  skipRequestIdentifiers?: boolean;
}): Promise<{
  /** All request information with attached identifiers */
  requestsWithRequestIdentifiers: ExportedPrivacyRequest[];
  /** Requests that are formatted for CSV */
  requestsFormattedForCsv: CsvRow[];
}> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Log date range
  let dateRange = '';
  if (createdAtBefore) {
    dateRange += ` before ${createdAtBefore.toISOString()}`;
  }
  if (createdAtAfter) {
    dateRange += `${dateRange ? ', and' : ''
      } after ${createdAtAfter.toISOString()}`;
  }
  logger.info(
    colors.magenta(
      `${actions.length > 0
        ? `Pulling requests of type "${actions.join('" , "')}"`
        : 'Pulling all requests'
      }${dateRange}`,
    ),
  );

  // Split into parallel date-range chunks when possible
  const useChunks = concurrency > 1 && createdAtAfter && createdAtBefore;
  const chunks = useChunks
    ? splitDateRange(createdAtAfter, createdAtBefore, concurrency)
    : [{ createdAtAfter, createdAtBefore }];

  if (useChunks) {
    logger.info(
      colors.magenta(
        `Splitting date range into ${concurrency} parallel chunks`,
      ),
    );
  }

  // Fetch requests across all chunks in parallel
  const chunkResults = await map(
    chunks,
    (chunk) =>
      fetchAllRequests(client, {
        actions,
        text: identifierSearch,
        statuses,
        createdAtBefore: chunk.createdAtBefore,
        createdAtAfter: chunk.createdAtAfter,
        updatedAtBefore,
        updatedAtAfter,
        isTest,
      }),
    { concurrency: useChunks ? concurrency : 1 },
  );
  const requests = chunkResults.flat();

  // Validate Sombra version once before bulk-fetching identifiers
  if (!skipRequestIdentifiers) {
    await validateSombraVersion(client);
  }

  // Fetch the request identifiers for those requests
  const requestsWithRequestIdentifiers = skipRequestIdentifiers
    ? requests.map((request) => ({
      ...request,
      requestIdentifiers: [] as RequestIdentifier[],
    }))
    : await map(
      requests,
      async (request) => {
        const requestIdentifiers = await fetchAllRequestIdentifiers(
          client,
          sombra,
          {
            requestId: request.id,
            skipSombraCheck: true,
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

  const data = requestsWithRequestIdentifiers.map(formatRequestForCsv);

  return { requestsWithRequestIdentifiers, requestsFormattedForCsv: data };
}
