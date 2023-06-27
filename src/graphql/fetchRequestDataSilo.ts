import { GraphQLClient } from 'graphql-request';
import { REQUEST_DATA_SILOS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  RequestDataSiloStatus,
  RequestStatus,
} from '@transcend-io/privacy-types';

export interface RequestDataSilo {
  /** ID of RequestDataSilo */
  id: string;
}

const PAGE_SIZE = 100;

/**
 * Fetch all request data silos by some filter criteria
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns List of request identifiers
 */
export async function fetchRequestDataSilos(
  client: GraphQLClient,
  {
    requestId,
    dataSiloId,
    requestStatuses,
    statuses,
  }: {
    /** ID of request to filter on */
    requestId?: string;
    /** Data silo ID */
    dataSiloId?: string;
    /**
     * The statuses to filter on
     */
    statuses?: RequestDataSiloStatus[];
    /** The request statuses to filter on */
    requestStatuses?: RequestStatus[];
  },
): Promise<RequestDataSilo[]> {
  const requestDataSilos: RequestDataSilo[] = [];
  let offset = 0;

  // Try to fetch an DataFlow with the same title
  let shouldContinue = false;
  do {
    const {
      requestDataSilos: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Request Data Silos */
      requestDataSilos: {
        /** List */
        nodes: RequestDataSilo[];
      };
    }>(client, REQUEST_DATA_SILOS, {
      first: PAGE_SIZE,
      offset,
      filterBy: {
        dataSiloId,
        requestId,
        status: statuses,
        requestStatus: requestStatuses,
      },
    });
    requestDataSilos.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return requestDataSilos;
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
  const nodes = await fetchRequestDataSilos(client, {
    requestId,
    dataSiloId,
  });
  if (nodes.length !== 1) {
    throw new Error(
      `Failed to find RequestDataSilo with requestId:${requestId},dataSiloId:${dataSiloId}`,
    );
  }

  return nodes[0];
}
