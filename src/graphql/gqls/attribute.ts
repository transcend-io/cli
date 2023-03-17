import { gql } from 'graphql-request';

// FIXME sync enum
export const ATTRIBUTES = gql`
  query TranscendCliAttributes($first: Int!, $offset: Int!) {
    attributeKeys(first: $first, offset: $offset) {
      nodes {
        id
        isCustom
        description
        enabledOnDataSilos
        enabledOnRequests
        enabledOnSubDataPoints
        enabledOnAirgapCookies
        enabledOnAirgapDataFlows
        enabledOnBusinessEntities
        enabledOnDataSubCategories
        enabledOnProcessingPurposeSubCategories
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

export const ATTRIBUTE_VALUES = gql`
  query TranscendCliAttributeValues(
    $first: Int!
    $offset: Int!
    $attributeKeyId: ID!
  ) {
    attributeValues(
      first: $first
      offset: $offset
      filterBy: { attributeKeys: [$attributeKeyId] }
    ) {
      nodes {
        id
        name
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
    $enabledOnDataSilos: Boolean!
    $enabledOnVendors: Boolean!
    $enabledOnRequests: Boolean!
    $enabledOnROPA: Boolean!
    $enabledOnSubDataPoints: Boolean!
    $enabledOnAirgapCookies: Boolean!
    $enabledOnAirgapDataFlows: Boolean!
    $enabledOnBusinessEntities: Boolean!
    $enabledOnDataSubCategories: Boolean!
    $enabledOnProcessingPurposeSubCategories: Boolean!
  ) {
    createAttributeKey(
      input: {
        name: $name
        type: $type
        description: $description
        enabledOnDataSilos: $enabledOnDataSilos
        enabledOnVendors: $enabledOnVendors
        enabledOnRequests: $enabledOnRequests
        enabledOnROPA: $enabledOnROPA
        enabledOnSubDataPoints: $enabledOnSubDataPoints
        enabledOnAirgapCookies: $enabledOnAirgapCookies
        enabledOnAirgapDataFlows: $enabledOnAirgapDataFlows
        enabledOnBusinessEntities: $enabledOnBusinessEntities
        enabledOnDataSubCategories: $enabledOnDataSubCategories
        enabledOnProcessingPurposeSubCategories: $enabledOnProcessingPurposeSubCategories
      }
    ) {
      clientMutationId
      attributeKey {
        id
      }
    }
  }
`;

// FIXME
export const UPDATE_ATTRIBUTE = gql`
  mutation TranscendCliCreateAttribute(
    $attributeKeyId: ID!
    $description: String
    $enabledOnDataSilos: Boolean
    $enabledOnROPA: Boolean
    $enabledOnRequests: Boolean
    $enabledOnSubDataPoints: Boolean
    $enabledOnVendors: Boolean
    $enabledOnAirgapCookies: Boolean
    $enabledOnAirgapDataFlows: Boolean
    $enabledOnBusinessEntities: Boolean
    $enabledOnDataSubCategories: Boolean
    $enabledOnProcessingPurposeSubCategories: Boolean
  ) {
    updateAttributeKey(
      input: {
        id: $attributeKeyId
        description: $description
        enabledOnDataSilos: $enabledOnDataSilos
        enabledOnVendors: $enabledOnVendors
        enabledOnROPA: $enabledOnROPA
        enabledOnRequests: $enabledOnRequests
        enabledOnSubDataPoints: $enabledOnSubDataPoints
        enabledOnAirgapCookies: $enabledOnAirgapCookies
        enabledOnAirgapDataFlows: $enabledOnAirgapDataFlows
        enabledOnBusinessEntities: $enabledOnBusinessEntities
        enabledOnDataSubCategories: $enabledOnDataSubCategories
        enabledOnProcessingPurposeSubCategories: $enabledOnProcessingPurposeSubCategories
      }
    ) {
      clientMutationId
      attributeKey {
        id
      }
    }
  }
`;
