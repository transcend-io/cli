import { GraphQLClient } from 'graphql-request';
import { CATALOGS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Catalog {
  /** Integration name */
  integrationName: string;
  /** Title of Data Silo */
  title: string;
  /** Whether API is supported */
  hasApiFunctionality: boolean;
}

const PAGE_SIZE = 100;

/**
 * Fetch all integration catalogs in an organization
 *
 * @param client - Client
 * @returns Integration catalogs
 */
export async function fetchAllCatalogs(
  client: GraphQLClient,
): Promise<Catalog[]> {
  const catalogs: Catalog[] = [];
  let offset = 0;

  // Paginate
  let shouldContinue = false;
  do {
    const {
      catalogs: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** integration catalogs */
      catalogs: {
        /** List */
        nodes: Catalog[];
      };
    }>(client, CATALOGS, {
      first: PAGE_SIZE,
      offset,
    });
    catalogs.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);
  return catalogs;
}
