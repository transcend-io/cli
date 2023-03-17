import { GraphQLClient } from 'graphql-request';
import { ATTRIBUTES } from './gqls';

import { logger } from '../logger';
import colors from 'colors';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Attribute {
  /** ID of attribute */
  id: string;
  /** Name of attribute */
  name: string;
  /** Description */
  description: string;
  // FIXME
  /** Enabled on data silos */
  enabledOnDataSilos: boolean;
  /** Enabled on data requests */
  enabledOnRequests: boolean;
  /** Enabled on sub datapoints */
  enabledOnSubDataPoints: boolean;
  /** Enabled on airgap cookies */
  enabledOnAirgapCookies: boolean;
  /** Enabled on data flows */
  enabledOnAirgapDataFlows: boolean;
  /** Enabled on business entities */
  enabledOnBusinessEntities: boolean;
  /** Enabled on data sub categories */
  enabledOnDataSubCategories: boolean;
  /** Enabled on processing purposes */
  enabledOnProcessingPurposeSubCategories: boolean;
  /** Type of attribute */
  type: string; // FIXME
  /** Values */
  values: {
    /** Attribute ID */
    id: string;
    /** Attribute name */
    name: string;
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all attributes in an organization
 *
 * @param client - GraphQL client
 * @returns A map from apiKey title to Identifier
 */
export async function fetchAllAttributes(
  client: GraphQLClient,
): Promise<Attribute[]> {
  logger.info(colors.magenta('Fetching all attributes...'));
  const attributes: Attribute[] = [];
  let offset = 0;

  // Paginate
  let shouldContinue = false;
  do {
    const {
      attributeKeys: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Query response */
      attributeKeys: {
        /** List of matches */
        nodes: Attribute[];
      };
    }>(client, ATTRIBUTES, {
      first: PAGE_SIZE,
      offset,
    });
    attributes.push(
      ...nodes.map((node) => ({
        ...node,
        values: [],
      })),
    );
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return attributes;
}
