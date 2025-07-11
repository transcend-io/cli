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
    $offset: Int!
    $requestIds: [ID!]!
  ) {
    requestIdentifiers(
      input: { requestIds: $requestIds }
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
        isVerifiedAtLeastOnce
      }
      totalCount
    }
  }
`;
