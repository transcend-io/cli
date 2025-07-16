import { GraphQLClient } from 'graphql-request';
import colors from 'colors';
import cliProgress from 'cli-progress';
import { REQUEST_DATA_SILOS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  RequestDataSiloStatus,
  RequestStatus,
} from '@transcend-io/privacy-types';
import { logger } from '../../logger';

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
    skipLog = false,
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
    /** When true, skip logging */
    skipLog?: boolean;
  },
): Promise<RequestDataSilo[]> {
  // create a new progress bar instance and use shades_classic theme
  const t0 = new Date().getTime();
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  const requestDataSilos: RequestDataSilo[] = [];
  let offset = 0;

  // Try to fetch an DataFlow with the same title
  let shouldContinue = false;
  do {
    const {
      requestDataSilos: { nodes, totalCount },
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

    if (offset === 0 && totalCount > PAGE_SIZE) {
      logger.info(colors.magenta(`Fetching ${totalCount} requests`));
      progressBar.start(totalCount, 0);
    }

    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
    progressBar.update(offset);
  } while (shouldContinue);

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  // Log completion time
  if (!skipLog) {
    logger.info(
      colors.green(
        `Completed fetching of ${
          requestDataSilos.length
        } request data silos in "${totalTime / 1000}" seconds.`,
      ),
    );
  }

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
    skipLog: true,
  });
  if (nodes.length !== 1) {
    throw new Error(
      `Failed to find RequestDataSilo with requestId:${requestId},dataSiloId:${dataSiloId}`,
    );
  }

  return nodes[0];
}
