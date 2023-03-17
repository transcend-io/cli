import { gql } from 'graphql-request';

// FIXME sync enum
export const ATTRIBUTES = gql`
  query TranscendCliAttributes($first: Int!, $offset: Int!) {
    attributeKeys(first: $first, offset: $offset) {
      nodes {
        id
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
