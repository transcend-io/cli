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

export interface RequestDataSiloFilters {
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
}

/**
 * Fetch a count of request data silos
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns List of request identifiers
 */
export async function fetchRequestDataSilosCount(
  client: GraphQLClient,
  { requestId, dataSiloId, requestStatuses, statuses }: RequestDataSiloFilters,
): Promise<number> {
  const {
    requestDataSilos: { totalCount },
  } = await makeGraphQLRequest<{
    /** Request Data Silos */
    requestDataSilos: {
      /** List */
      nodes: RequestDataSilo[];
      /** Total count */
      totalCount: number;
    };
  }>(client, REQUEST_DATA_SILOS, {
    first: 1,
    offset: 0,
    filterBy: {
      dataSiloId,
      requestId,
      status: statuses,
      requestStatus: requestStatuses,
    },
  });

  return totalCount;
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
    limit,
    onProgress,
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
    /** Limit on number of requests */
    limit?: number;
    /** Handle progress updates */
    onProgress?: (numUpdated: number) => void;
  },
): Promise<RequestDataSilo[]> {
  const requestDataSilos: RequestDataSilo[] = [];
  let offset = 0;

  // Try to fetch an DataFlow with the same title
  let shouldContinue = false;
  do {
    const {
      requestDataSilos: { nodes },
    } = await makeGraphQLRequest<{
      /** Request Data Silos */
      requestDataSilos: {
        /** List */
        nodes: RequestDataSilo[];
        /** Total count */
        totalCount: number;
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
    onProgress?.(nodes.length);
  } while (shouldContinue && (!limit || offset < limit));

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
