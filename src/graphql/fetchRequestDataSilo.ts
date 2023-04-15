import { GraphQLClient } from 'graphql-request';
import { REQUEST_DATA_SILOS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface RequestDataSilo {
  /** ID of RequestDataSilo */
  id: string;
}

/**
 * Fetch all request identifiers for a particular request
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns List of request identifiers
 */
export async function fetchRequestDataSilo(
  client: GraphQLClient,
  {
    requestId,
    dataSiloId,
  }: {
    /** ID of request to filter on */
    requestId: string;
    /** Data silo ID */
    dataSiloId: string;
  },
): Promise<RequestDataSilo> {
  const {
    requestDataSilos: { nodes },
  } = await makeGraphQLRequest<{
    /** Request Data Silos */
    requestDataSilos: {
      /** List */
      nodes: RequestDataSilo[];
    };
  }>(client, REQUEST_DATA_SILOS, {
    dataSiloId,
    requestId,
  });
  if (nodes.length !== 1) {
    throw new Error(
      `Failed to find RequestDataSilo with requestId:${requestId},dataSiloId:${dataSiloId}`,
    );
  }

  return nodes[0];
}
