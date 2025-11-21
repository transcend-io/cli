import { GraphQLClient } from 'graphql-request';
import { SILO_DISCOVERY_RESULTS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import type {
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';

export interface SiloDiscoveryResult {
  /** Title of silo discovery result */
  title?: string;
  /** Resource ID of silo discovery result */
  resourceId: string;
  /** Suggested catalog */
  suggestedCatalog: {
    /** Title */
    title: string;
  };
  containsSensitiveData: string;
  /** Hosting country of data silo discovery result */
  country?: IsoCountryCode;
  /** Hosting subdivision data silo discovery result */
  countrySubDivision?: IsoCountrySubdivisionCode;
  /** Plaintext context data silo discovery result */
  plaintextContext: string;
  /** The plugin that found this result */
  plugin: {
    /** The data silo the plugin belongs to */
    dataSilo: {
      /** The internal display title */
      title: string;
    };
  };
}

const PAGE_SIZE = 30;

/**
 * Fetch all silo discovery results in the organization
 *
 * @param client - GraphQL client
 * @returns All silo discovery results in the organization
 */
export async function fetchAllSiloDiscoveryResults(
  client: GraphQLClient,
): Promise<SiloDiscoveryResult[]> {
  const siloDiscoveryResults: SiloDiscoveryResult[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      siloDiscoveryResults: { nodes },
    } = await makeGraphQLRequest<{
      siloDiscoveryResults: {
        nodes: SiloDiscoveryResult[];
      };
    }>(client, SILO_DISCOVERY_RESULTS, {
      first: PAGE_SIZE,
      offset,
      input: {},
      filterBy: {},
    });

    const titledNodes = nodes.map((node) =>
      node.title === null && node.suggestedCatalog?.title
        ? { ...node, title: node.suggestedCatalog.title }
        : node,
    );

    siloDiscoveryResults.push(...titledNodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return siloDiscoveryResults;
}
