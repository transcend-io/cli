import { gql } from 'graphql-request';
import { ATTRIBUTE_KEY_TO_ENABLED_ON } from '../../tmp-attribute-key';

// TODO: https://transcend.height.app/T-23527 - remove these when GraphQL schema is re-designed
const ENABLED_ON_QUERY_INPUT = Object.values(ATTRIBUTE_KEY_TO_ENABLED_ON)
  .map((enabledOn) => `    $${enabledOn}: Boolean`)
  .join('\n');
const ENABLED_ON_RESPONSE = Object.values(ATTRIBUTE_KEY_TO_ENABLED_ON)
  .map((enabledOn) => `        ${enabledOn}`)
  .join('\n');
const ENABLED_ON_INPUT = Object.values(ATTRIBUTE_KEY_TO_ENABLED_ON)
  .map((enabledOn) => `        ${enabledOn}: $${enabledOn}`)
  .join('\n');
const ENABLED_ON_CREATE_INPUT = Object.values(ATTRIBUTE_KEY_TO_ENABLED_ON)
  .map((enabledOn) => `    $${enabledOn}: Boolean`)
  .join('\n');

// TODO: https://transcend.height.app/T-27909 - order by createdAt
// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const ATTRIBUTES = gql`
  query TranscendCliAttributes($first: Int!, $offset: Int!) {
    attributeKeys(first: $first, offset: $offset, useMaster: false) {
      nodes {
        id
        isCustom
        description
        ${ENABLED_ON_RESPONSE}
        name
        type
      }
    }
  }
`;

export const CREATE_ATTRIBUTE_VALUES = gql`
  mutation TranscendCliCreateAttributeValues(
    $input: [CreateAttributeValuesInput!]!
  ) {
    createAttributeValues(input: $input) {
      clientMutationId
    }
  }
`;

// TODO: https://transcend.height.app/T-27909 - order by createdAt
// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const ATTRIBUTE_VALUES = gql`
  query TranscendCliAttributeValues(
    $first: Int!
    $offset: Int!
    $attributeKeyId: ID!
  ) {
    attributeValues(
      first: $first
      offset: $offset
      useMaster: false
      filterBy: { attributeKeys: [$attributeKeyId] }
    ) {
      nodes {
        id
        name
        description
        color
      }
    }
  }
`;

export const CREATE_ATTRIBUTE = gql`
  mutation TranscendCliCreateAttribute(
    $name: String!
    $type: AttributeKeyType!
    $description: String
${ENABLED_ON_CREATE_INPUT}
  ) {
    createAttributeKey(
      input: {
        name: $name
        type: $type
        description: $description
${ENABLED_ON_INPUT}
      }
    ) {
      clientMutationId
      attributeKey {
        id
      }
    }
  }
`;

export const UPDATE_ATTRIBUTE = gql`
  mutation TranscendCliCreateAttribute(
    $attributeKeyId: ID!
    $description: String
${ENABLED_ON_QUERY_INPUT}
  ) {
    updateAttributeKey(
      input: {
        id: $attributeKeyId
        description: $description
${ENABLED_ON_INPUT}
      }
    ) {
      clientMutationId
      attributeKey {
        id
      }
    }
  }
`;

export const SET_RESOURCE_ATTRIBUTES = gql`
  mutation TranscendCliSetResourceAttributes(
    $input: SetResourceAttributesInput!
  ) {
    setResourceAttributes(input: $input) {
      clientMutationId
    }
  }
`;
