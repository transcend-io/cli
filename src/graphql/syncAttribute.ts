import { AttributeInput } from '../codecs';
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
 * @param client - GraphQL client
 * @param attribute - The attribute input
 * @param existingAttribute - The existing attribute configuration if it exists
 */
export async function syncAttribute(
  client: GraphQLClient,
  attribute: AttributeInput,
  existingAttribute?: Attribute,
): Promise<void> {
  // attribute key input
  const input = {
    name: attribute.name,
    enabledOn: attribute.resources || [],
  };

  // create or update attribute key
  let attributeKeyId: string;
  if (!existingAttribute) {
    const {
      createAttributeKey: { attributeKey },
    } = await makeGraphQLRequest<{
      /** Create attribute key response */
      createAttributeKey: {
        /** Attribute key */
        attributeKey: {
          /** ID */
          id: string;
        };
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
        color: color || undefined,
        name,
        attributeKeyId,
      })),
    });
  }
}
