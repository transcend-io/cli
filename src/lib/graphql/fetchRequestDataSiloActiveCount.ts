import { GraphQLClient } from 'graphql-request';
import { REDUCED_REQUESTS_FOR_DATA_SILO_COUNT } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Get number of open requests for a data silo
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns List of request identifiers
 */
export async function fetchRequestDataSiloActiveCount(
  client: GraphQLClient,
  {
    dataSiloId,
  }: {
    /** Data silo ID */
    dataSiloId: string;
  },
): Promise<number> {
  const {
    listReducedRequestsForDataSilo: { totalCount },
  } = await makeGraphQLRequest<{
    /** Requests */
    listReducedRequestsForDataSilo: {
      /** Total count */
      totalCount: number;
    };
  }>(client, REDUCED_REQUESTS_FOR_DATA_SILO_COUNT, {
    input: {
      dataSiloId,
      isResolved: false,
    },
  });

  return totalCount;
}
