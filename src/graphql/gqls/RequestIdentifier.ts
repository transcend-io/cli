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
      # Order by createdAt to ensure pagination consistent as new silos are created
      orderBy: [{ field: createdAt, direction: ASC }]
    ) {
      nodes {
        id
        name
        value
        identifier {
          type
        }
        isVerifiedAtLeastOnce
        isVerified
      }
      totalCount
    }
  }
`;
