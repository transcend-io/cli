import { gql } from 'graphql-request';

export const REMOVE_REQUEST_IDENTIFIERS = gql`
  mutation TranscendCliRemoveRequestIdentifiers(
    $input: RemoveRequestIdentifiersInput!
  ) {
    removeRequestIdentifiers(input: $input) {
      count
    }
  }
`;

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const REQUEST_IDENTIFIERS = gql`
  query TranscendCliRequestIdentifiers(
    $first: Int!
    $after: String
    $requestIds: [ID!]
    $updatedAtBefore: Date
    $updatedAtAfter: Date
  ) {
    requestIdentifiers(
      input: { requestIds: $requestIds }
      filterBy: {
        updatedAtBefore: $updatedAtBefore
        updatedAtAfter: $updatedAtAfter
      }
      first: $first
      after: $after
      useMaster: false
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: name, direction: ASC }
      ]
    ) {
      nodes {
        id
        name
        isVerifiedAtLeastOnce
      }
      totalCount
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;
