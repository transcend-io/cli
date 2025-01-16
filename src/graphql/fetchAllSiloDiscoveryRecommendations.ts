import { GraphQLClient } from 'graphql-request';
import { SILO_DISCOVERY_RECOMMENDATIONS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface SiloDiscoveryRecommendation {
  /** Title of silo discovery recommendation */
  title: string;
  /** Resource ID of silo discovery recommendation */
  resourceId: string;
  /** Last discovered at */
  lastDiscoveredAt: string;
  /** Suggested catalog */
  suggestedCatalog: {
    /** Title */
    title: string;
  };
}

const PAGE_SIZE = 20;

/**
 * Fetch all silo discovery recommendations in the organization
 *
 * @param client - GraphQL client
 * @returns All silo discovery recommendations in the organization
 */
export async function fetchAllSiloDiscoveryRecommendations(
  client: GraphQLClient,
): Promise<SiloDiscoveryRecommendation[]> {
  const siloDiscoveryRecommendations: SiloDiscoveryRecommendation[] = [];
  let lastKey;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      siloDiscoveryRecommendations: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Silo Discovery Recommendations */
      siloDiscoveryRecommendations: {
        /** List */
        nodes: SiloDiscoveryRecommendation[];
      };
    }>(client, SILO_DISCOVERY_RECOMMENDATIONS, {
      first: PAGE_SIZE,
      input: ,
      filterBy:
    });
    siloDiscoveryRecommendations.push(...nodes);
    lastKey = PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return siloDiscoveryRecommendations.sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}
