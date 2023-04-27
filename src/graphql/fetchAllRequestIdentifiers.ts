import { GraphQLClient } from 'graphql-request';
import { REQUEST_IDENTIFIERS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { IdentifierType } from '@transcend-io/privacy-types';

export interface RequestIdentifier {
  /** ID of request */
  id: string;
  /** Name of identifier */
  name: string;
  /** The underlying identifier value */
  value: string;
  /** Identifier metadata */
  identifier: {
    /** Type of identifier */
    type: IdentifierType;
  };
  /** Whether request identifier has been verified at least one */
  isVerifiedAtLeastOnce: boolean;
  /** Whether request identifier has been verified */
  isVerified: boolean;
}

const PAGE_SIZE = 50;

/**
 * Fetch all request identifiers for a particular request
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns List of request identifiers
 */
export async function fetchAllRequestIdentifiers(
  client: GraphQLClient,
  {
    requestId,
  }: {
    /** ID of request to filter on */
    requestId: string;
  },
): Promise<RequestIdentifier[]> {
  const requestIdentifiers: RequestIdentifier[] = [];
  let offset = 0;

  // Paginate
  let shouldContinue = false;
  do {
    const {
      requestIdentifiers: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Request Identifiers */
      requestIdentifiers: {
        /** List */
        nodes: RequestIdentifier[];
      };
    }>(client, REQUEST_IDENTIFIERS, {
      first: PAGE_SIZE,
      offset,
      requestId,
    });
    requestIdentifiers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return requestIdentifiers;
}
