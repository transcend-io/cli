import { GraphQLClient } from 'graphql-request';
import colors from 'colors';
import { REQUESTS, REQUESTS_COUNT } from './gqls';
import * as t from 'io-ts';
import cliProgress from 'cli-progress';
import { valuesOf } from '@transcend-io/type-utils';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  RequestAction,
  RequestOrigin,
  RequestStatus,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';
import { logger } from '../../logger';
import { LOCALE_KEY } from '@transcend-io/internationalization';

export const RequestPurposeTrigger = t.type({
  title: t.string,
  name: t.string,
  consent: t.boolean,
  enrichedPreferences: t.array(
    t.type({
      topic: t.string,
      selectValues: t.array(
        t.type({
          id: t.string,
          name: t.string,
          preferenceOption: t.type({
            id: t.string,
            slug: t.string,
            title: t.type({
              defaultMessage: t.string,
            }),
          }),
        }),
      ),
      selectValue: t.type({
        id: t.string,
        name: t.string,
      }),
      preferenceTopic: t.type({
        title: t.type({
          defaultMessage: t.string,
        }),
        id: t.string,
        slug: t.string,
      }),
      name: t.string,
      id: t.string,
      booleanValue: t.boolean,
    }),
  ),
});

/** Override type */
export type RequestPurposeTrigger = t.TypeOf<typeof RequestPurposeTrigger>;

export const PrivacyRequest = t.intersection([
  t.type({
    /** Request ID */
    id: t.string,
    /** Time request was made */
    createdAt: t.string,
    /** Email of request */
    email: t.string,
    /** The type of request */
    type: valuesOf(RequestAction),
    /** Link to request in Transcend dashboard */
    link: t.string,
    /** Whether request is in silent mode */
    isSilent: t.boolean,
    /** Where request was made */
    origin: valuesOf(RequestOrigin),
    /** Whether request is a test request */
    isTest: t.boolean,
    /** The core identifier of the request */
    coreIdentifier: t.string,
    /** Request details */
    details: t.string,
    /** Locale of request */
    locale: valuesOf(LOCALE_KEY),
    /** Status of request */
    status: valuesOf(RequestStatus),
    /** Type of data subject */
    subjectType: t.string,
    /** Country of request */
    country: t.union([t.null, valuesOf(IsoCountryCode)]),
    /** Subdivision of request */
    countrySubDivision: t.union([t.null, valuesOf(IsoCountrySubdivisionCode)]),
    /** Request attributes */
    attributeValues: t.array(
      t.type({
        id: t.string,
        attributeKey: t.type({ name: t.string, id: t.string }),
        name: t.string,
      }),
    ),
  }),
  t.partial({
    /** Days remaining until expired */
    daysRemaining: t.union([t.null, t.number]),
    /** Purpose */
    purpose: RequestPurposeTrigger,
  }),
]);

/** Type override */
export type PrivacyRequest = t.TypeOf<typeof PrivacyRequest>;

const PAGE_SIZE = 100;

/**
 * Fetch all requests matching a set of filters.
 *
 * When `onPage` is provided the function streams pages to the callback
 * and never accumulates nodes in memory — ideal for very large exports.
 * Without `onPage` the function returns all nodes in a single array
 * (existing behaviour, kept for backward compatibility).
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns List of requests (empty when using onPage)
 */
export async function fetchAllRequests(
  client: GraphQLClient,
  {
    actions = [],
    statuses = [],
    origins = [],
    text,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    isTest,
    isSilent,
    isClosed,
    requestIds = [],
    onPage,
  }: {
    /** Actions to filter on */
    actions?: RequestAction[];
    /** Origins to filter on */
    origins?: RequestOrigin[];
    /** Statuses to filter on */
    statuses?: RequestStatus[];
    /** Filter for requests created before this date */
    createdAtBefore?: Date;
    /** Filter for requests created after this date */
    createdAtAfter?: Date;
    /** Filter for requests updated before this date */
    updatedAtBefore?: Date;
    /** Filter for requests updated after this date */
    updatedAtAfter?: Date;
    /** Filter for requests with a specific identifier */
    text?: string;
    /** Return test requests */
    isTest?: boolean;
    /** Return silent mode requests */
    isSilent?: boolean;
    /** Filter by whether request is active */
    isClosed?: boolean;
    /**
     * Filter the list of requests for a set of IDs - these are applied
     * at runtime while other filters are applied at the GraphQL level.
     */
    requestIds?: string[];
    /** When provided, called with each page of nodes instead of accumulating in memory */
    onPage?: (nodes: PrivacyRequest[]) => void | Promise<void>;
  } = {},
): Promise<PrivacyRequest[]> {
  logger.info(colors.magenta('Fetching requests...'));

  const streaming = !!onPage;

  // create a new progress bar instance and use shades_classic theme
  const t0 = new Date().getTime();
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  const requests: PrivacyRequest[] = [];
  let fetchedCount = 0;

  const filterBy = {
    text,
    type: actions.length > 0 ? actions : undefined,
    status: statuses.length > 0 ? statuses : undefined,
    origin: origins.length > 0 ? origins : undefined,
    isTest,
    isSilent,
    isClosed,
    createdAtBefore: createdAtBefore
      ? createdAtBefore.toISOString()
      : undefined,
    createdAtAfter: createdAtAfter ? createdAtAfter.toISOString() : undefined,
    updatedAtBefore: updatedAtBefore
      ? updatedAtBefore.toISOString()
      : undefined,
    updatedAtAfter: updatedAtAfter ? updatedAtAfter.toISOString() : undefined,
  };

  // Fetch total count upfront for the progress bar
  const {
    requests: { totalCount },
  } = await makeGraphQLRequest<{
    /** Requests */
    requests: {
      /** Total count */
      totalCount: number;
    };
  }>(client, REQUESTS_COUNT, { filterBy });

  if (totalCount > PAGE_SIZE) {
    logger.info(colors.magenta(`Fetching ${totalCount} requests`));
    progressBar.start(totalCount, 0);
  }

  // Paginate through all results
  let cursor: string | undefined;
  let shouldContinue = false;
  do {
    const {
      requests: { nodes, pageInfo },
    } = await makeGraphQLRequest<{
      /** Requests */
      requests: {
        /** List */
        nodes: PrivacyRequest[];
        /** Pagination info */
        pageInfo: {
          /** Cursor for the last item */
          endCursor: string | null;
          /** Whether more pages exist */
          hasNextPage: boolean;
        };
      };
    }>(client, REQUESTS, {
      first: PAGE_SIZE,
      after: cursor,
      filterBy,
    });

    if (streaming) {
      await onPage!(nodes);
    } else {
      requests.push(...nodes);
    }

    fetchedCount += nodes.length;
    cursor = pageInfo.endCursor ?? undefined;
    progressBar.update(fetchedCount);
    shouldContinue = pageInfo.hasNextPage;
  } while (shouldContinue);

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Completed fetching of ${fetchedCount} request in "${
        totalTime / 1000
      }" seconds.`,
    ),
  );

  if (streaming) {
    return [];
  }

  // Filter down requests by request ID
  let allRequests = requests;
  if (requestIds && requestIds.length > 0) {
    allRequests = allRequests.filter((request) =>
      requestIds.includes(request.id),
    );
    logger.info(
      colors.green(
        `Filtered down to ${allRequests.length} requests based on ${requestIds.length} provided IDs.`,
      ),
    );
  }

  return allRequests;
}
