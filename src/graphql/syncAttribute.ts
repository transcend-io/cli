import {
  ATTRIBUTE_KEY_SINGULAR_TO_PLURAL,
  AttributeInput,
  AttributeResourceType,
} from '../codecs';
import difference from 'lodash/difference';
import upperFirst from 'lodash/upperFirst';
import keyBy from 'lodash/keyBy';
import { GraphQLClient } from 'graphql-request';
import {
  CREATE_ATTRIBUTE,
  CREATE_ATTRIBUTE_VALUES,
  UPDATE_ATTRIBUTE,
} from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { Attribute } from './fetchAllAttributes';

/**
 * Sync attribute
 *
 * @param attributes - The attribute input
 * @param client - GraphQL client
 */
export async function syncAttribute(
  client: GraphQLClient,
  attribute: AttributeInput,
  existingAttribute?: Attribute,
): Promise<void> {
  // attribute key input
  const input = {
    name: attribute.name,
    ...attribute.resources?.reduce(
      (acc, resource) =>
        Object.assign(acc, {
          [`enabledOn${upperFirst(
            ATTRIBUTE_KEY_SINGULAR_TO_PLURAL[resource],
          )}`]: true,
        }),
      {},
    ),
    ...difference(
      Object.values(AttributeResourceType),
      attribute.resources || [],
    ).reduce(
      (acc, resource) =>
        Object.assign(acc, {
          [`enabledOn${upperFirst(
            ATTRIBUTE_KEY_SINGULAR_TO_PLURAL[resource],
          )}`]: false,
        }),
      {},
    ),
  };

  // create or update attribute key
  let attributeKeyId: string;
  if (!existingAttribute) {
    const { attributeKey } = await makeGraphQLRequest<{
      attributeKey: {
        id: string;
      };
    }>(client, CREATE_ATTRIBUTE, {
      type: attribute.type,
      description: attribute.description,
      ...input,
    });
    attributeKeyId = attributeKey.id;
  } else {
    await makeGraphQLRequest(client, UPDATE_ATTRIBUTE, {
      attributeKeyId: existingAttribute.id,
      description: existingAttribute.isCustom
        ? attribute.description
        : undefined,
      ...input,
    });
    attributeKeyId = existingAttribute.id;
  }

  // upsert attribute values
  const existingAttributeMap = keyBy(existingAttribute?.values || [], 'name');
  const missingAttributes = !existingAttribute
    ? attribute.values || []
    : attribute.values?.filter((value) => !existingAttributeMap[value.name]) ||
      [];
  if (missingAttributes.length > 0) {
    await makeGraphQLRequest(client, CREATE_ATTRIBUTE_VALUES, {
      input: missingAttributes.map(({ color, name }) => ({
        color,
        name,
        attributeKeyId,
      })),
    });
  }
}
