import { GraphQLClient } from 'graphql-request';
import { REQUEST_IDENTIFIERS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface RequestIdentifierMetadata {
  /** ID of request identifier */
  id: string;
  /** Name of identifier */
  name: string;
  /** Status of identifier */
  isVerifiedAtLeastOnce: boolean;
}

const PAGE_SIZE = 2000;

/**
 * Fetch all request identifier metadata for a particular request
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns List of request identifiers
 */
export async function fetchAllRequestIdentifierMetadata(
  client: GraphQLClient,
  {
    requestId,
    requestIds,
    updatedAtBefore,
    updatedAtAfter,
  }: {
    /** ID of request to filter on */
    requestId?: string;
    /** IDs of requests to filter on */
    requestIds?: string[];
    /** Filter for request identifiers updated before this date */
    updatedAtBefore?: Date;
    /** Filter for request identifiers updated after this date */
    updatedAtAfter?: Date;
  },
): Promise<RequestIdentifierMetadata[]> {
  const resolvedRequestIds =
    requestIds ?? (requestId ? [requestId] : undefined);
  const requestIdentifiers: RequestIdentifierMetadata[] = [];
  let cursor: string | undefined;

  // Paginate
  let shouldContinue = false;
  do {
    const {
      requestIdentifiers: { nodes, pageInfo },
    } = await makeGraphQLRequest<{
      /** Request Identifiers */
      requestIdentifiers: {
        /** List */
        nodes: RequestIdentifierMetadata[];
        /** Pagination info */
        pageInfo: {
          /** Cursor for the last item */
          endCursor: string | null;
          /** Whether more pages exist */
          hasNextPage: boolean;
        };
      };
    }>(client, REQUEST_IDENTIFIERS, {
      first: PAGE_SIZE,
      after: cursor,
      requestIds: resolvedRequestIds,
      updatedAtBefore: updatedAtBefore
        ? updatedAtBefore.toISOString()
        : undefined,
      updatedAtAfter: updatedAtAfter ? updatedAtAfter.toISOString() : undefined,
    });
    requestIdentifiers.push(...nodes);
    cursor = pageInfo.endCursor ?? undefined;
    shouldContinue = pageInfo.hasNextPage;
  } while (shouldContinue);

  return requestIdentifiers;
}
