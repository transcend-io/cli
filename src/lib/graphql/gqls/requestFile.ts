import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const REQUEST_FILES = gql`
  query TranscendCliRequestFiles(
    $first: Int!
    $offset: Int!
    $filterBy: RequestFileFiltersInput!
  ) {
    requestFiles(
      filterBy: $filterBy
      first: $first
      offset: $offset
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: id, direction: ASC }
      ]
    ) {
      nodes {
        remoteId
        fileName
      }
    }
  }
`;
