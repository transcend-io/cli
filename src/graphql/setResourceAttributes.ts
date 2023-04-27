import { GraphQLClient } from 'graphql-request';
import { SET_RESOURCE_ATTRIBUTES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { AttributeResourceType } from '../tmp-attribute-key';

interface SetResourceAttributesInput {
  /** ID of resource */
  resourceId: string;
  /** Type of resource */
  resourceType: AttributeResourceType;
  /** Attribute key ID */
  attributeKeyId: string;
  /** Attribute values by ID */
  attributeValueIds?: string[];
  /** Attribute values by name */
  attributeValueNames?: string[];
}

/**
 * Set attribute values on a particular resource
 *
 * @param client - GraphQL client
 * @param input - Input
 */
export async function setResourceAttributes(
  client: GraphQLClient,
  input: SetResourceAttributesInput,
): Promise<void> {
  await makeGraphQLRequest(client, SET_RESOURCE_ATTRIBUTES, {
    input,
  });
}
