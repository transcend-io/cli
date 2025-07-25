import { GraphQLClient } from 'graphql-request';
import { ATTRIBUTES, ATTRIBUTE_VALUES } from './gqls';

import { logger } from '../../logger';
import colors from 'colors';
import {
  AttributeKeyType,
  AttributeSupportedResourceType,
} from '@transcend-io/privacy-types';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface AttributeValue {
  /** Attribute ID */
  id: string;
  /** Attribute name */
  name: string;
  /** Attribute description */
  description: string;
  /** Color of attribute value */
  color: string;
}

export interface Attribute {
  /** ID of attribute */
  id: string;
  /** Name of attribute */
  name: string;
  /** if custom attribute */
  isCustom: boolean;
  /** Description */
  description: string;
  /** Type of attribute */
  type: AttributeKeyType;
  /** Values */
  values: AttributeValue[];
  /** The different fields that the attribute is enabled on  */
  enabledOn: AttributeSupportedResourceType[];
}

const PAGE_SIZE = 100;

/**
 * Fetch all attribute values for an attribute key
 *
 * @param client - GraphQL client
 * @param attributeKeyId - Attribute keyID
 * @returns A map from apiKey title to Identifier
 */
export async function fetchAllAttributeValues(
  client: GraphQLClient,
  attributeKeyId: string,
): Promise<AttributeValue[]> {
  logger.info(
    colors.magenta(`Fetching all attribute values for ${attributeKeyId}...`),
  );
  const attributeValues: AttributeValue[] = [];
  let offset = 0;

  // Paginate
  let shouldContinue = false;
  do {
    const {
      attributeValues: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      attributeValues: {
        /** List of matches */
        nodes: AttributeValue[];
      };
    }>(client, ATTRIBUTE_VALUES, {
      first: PAGE_SIZE,
      offset,
      attributeKeyId,
    });
    attributeValues.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return attributeValues.sort((a, b) => a.name.localeCompare(b.name));
}

export const SYNC_ATTRIBUTE_TYPES = [
  AttributeKeyType.MultiSelect,
  AttributeKeyType.SingleSelect,
];

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
      ...(await Promise.all(
        nodes.map(async (node) => ({
          ...node,
          values: SYNC_ATTRIBUTE_TYPES.includes(node.type)
            ? await fetchAllAttributeValues(client, node.id)
            : [],
        })),
      )),
    );
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return attributes.sort((a, b) => a.name.localeCompare(b.name));
}
