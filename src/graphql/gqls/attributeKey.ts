import { gql } from 'graphql-request';

export const ATTRIBUTE_KEYS_REQUESTS = gql`
  query TranscendCliAttributeKeys($first: Int!, $offset: Int!) {
    attributeKeys(
      filterBy: { enabledOnRequests: true }
      first: $first
      useMaster: false
      # TODO: https://transcend.height.app/T-27909 - order by createdAt
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
