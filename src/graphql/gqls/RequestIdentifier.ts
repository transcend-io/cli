import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
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
      useMaster: false
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: name, direction: ASC }
      ]
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
