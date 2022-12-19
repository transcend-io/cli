import { gql } from 'graphql-request';

export const REQUEST_ENRICHERS = gql`
  query TranscendCliRequestEnrichers(
    $first: Int!
    $offset: Int!
    $requestId: ID!
  ) {
    requestEnrichers(
      input: { requestId: $requestId }
      first: $first
      offset: $offset
    ) {
      nodes {
        id
        status
        enricher {
          id
          type
          title
        }
      }
      totalCount
    }
  }
`;
