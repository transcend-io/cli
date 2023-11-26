import { gql } from 'graphql-request';

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
        enabledOn
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

export const UPDATE_ATTRIBUTE_VALUES = gql`
  mutation TranscendCliUpdateAttributeValues(
    $input: [UpdateAttributeValueInput!]!
  ) {
    updateAttributeValues(input: $input) {
      clientMutationId
    }
  }
`;

export const DELETE_ATTRIBUTE_VALUE = gql`
  mutation TranscendCliDeleteAttributeValue($id: ID!) {
    deleteAttributeValue(id: $id) {
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
    $enabledOn: [AttributeSupportedResourceType!]!
  ) {
    createAttributeKey(
      input: {
        name: $name
        type: $type
        description: $description
        enabledOn: $enabledOn
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
    $enabledOn: [AttributeSupportedResourceType!]
  ) {
    updateAttributeKey(
      input: {
        id: $attributeKeyId
        description: $description
        enabledOn: $enabledOn
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
