import { GraphQLClient } from 'graphql-request';
import { DATA_FLOWS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { fetchConsentManagerId } from './fetchConsentManagerId';

export interface DataFlow {
  id: string;
  value: string;
  type: string; // FIXME
  description: string;
  trackingType: string[];
  service: {
    integrationName: string;
  };
  source: string; // FIXME
  status: string; //FIXME
  owners: {
    email: string;
  }[];
  teams: {
    name: string;
  }[];
  attributeValues: {
    name: string;
    attributeKey: {
      name: string;
    };
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all DataFlows in the organization
 *
 * @param client - GraphQL client
 * @returns All DataFlows in the organization
 */
export async function fetchAllDataFlows(
  client: GraphQLClient,
): Promise<DataFlow[]> {
  const dataFlows: DataFlow[] = [];
  let offset = 0;

  const airgapBundleId = await fetchConsentManagerId(client);

  // Try to fetch an DataFlow with the same title
  let shouldContinue = false;
  do {
    const {
      dataFlows: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Query response */
      dataFlows: {
        /** List of matches */
        nodes: DataFlow[];
      };
    }>(client, DATA_FLOWS, {
      first: PAGE_SIZE,
      offset,
      airgapBundleId,
      status: 'LIVE', // FIXME
    });
    dataFlows.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return dataFlows;
}
