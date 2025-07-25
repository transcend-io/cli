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
  return catalogs.sort((a, b) =>
    a.integrationName.localeCompare(b.integrationName),
  );
}

export interface IndexedCatalogs {
  /** Mapping from service name to service title */
  serviceToTitle: { [k in string]: string };
  /** Mapping from service name to boolean indicate if service has API integration support */
  serviceToSupportedIntegration: { [k in string]: boolean };
}

/**
 * Fetch all integration catalogs and index them for usage in common utility manners
 *
 * @param client - Client
 * @returns Integration catalogs
 */
export async function fetchAndIndexCatalogs(client: GraphQLClient): Promise<
  {
    /** List of all catalogs */
    catalogs: Catalog[];
  } & IndexedCatalogs
> {
  // Fetch all integrations in the catalog
  const catalogs = await fetchAllCatalogs(client);

  // Create mapping from service name to service title
  const serviceToTitle = catalogs.reduce(
    (acc, catalog) =>
      Object.assign(acc, { [catalog.integrationName]: catalog.title }),
    {} as { [k in string]: string },
  );

  // Create mapping from service name to boolean indicate if service has API integration support
  const serviceToSupportedIntegration = catalogs.reduce(
    (acc, catalog) =>
      Object.assign(acc, {
        [catalog.integrationName]: catalog.hasApiFunctionality,
      }),
    {} as { [k in string]: boolean },
  );

  return {
    catalogs,
    serviceToTitle,
    serviceToSupportedIntegration,
  };
}
