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
      # Order by createdAt to ensure pagination consistent as new silos are created
      orderBy: [{ field: createdAt, direction: ASC }]
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
