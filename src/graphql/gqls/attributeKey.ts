import { gql } from 'graphql-request';

export const ATTRIBUTE_KEYS_REQUESTS = gql`
  query TranscendCliAttributeKeys($first: Int!, $offset: Int!) {
    attributeKeys(
      filterBy: { enabledOnRequests: true }
      first: $first
      offset: $offset
    ) {
      nodes {
        id
        name
        type
      }
    }
  }
`;
