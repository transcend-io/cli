import { gql } from 'graphql-request';

export const REQUEST_IDENTIFIERS = gql`
  query TranscendCliRequestIdentifiers(
    $first: Int!
    $offset: Int!
    $requestId: ID!
  ) {
    requestIdentifiers(
      input: { requestId: $requestId }
      first: $first
      offset: $offset
    ) {
      nodes {
        id
        name
        value
        isVerifiedAtLeastOnce
        isVerified
      }
      totalCount
    }
  }
`;
