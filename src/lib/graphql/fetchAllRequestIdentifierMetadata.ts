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

const PAGE_SIZE = 50;

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
  }: {
    /** ID of request to filter on */
    requestId: string;
  },
): Promise<RequestIdentifierMetadata[]> {
  const requestIdentifiers: RequestIdentifierMetadata[] = [];
  let offset = 0;

  // Paginate
  let shouldContinue = false;
  do {
    const {
      requestIdentifiers: { nodes },
    } = await makeGraphQLRequest<{
      /** Request Identifiers */
      requestIdentifiers: {
        /** List */
        nodes: RequestIdentifierMetadata[];
      };
    }>(client, REQUEST_IDENTIFIERS, {
      first: PAGE_SIZE,
      offset,
      requestIds: [requestId],
    });
    requestIdentifiers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return requestIdentifiers;
}
