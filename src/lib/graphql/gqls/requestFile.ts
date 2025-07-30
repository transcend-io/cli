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

export const BULK_REQUEST_FILES = gql`
  query TranscendCliBulkRequestFiles(
    $filterBy: BulkRequestFilesFiltersInput!
    $first: Int!
    $after: String
  ) {
    bulkRequestFiles(filterBy: $filterBy, first: $first, after: $after) {
      nodes {
        remoteId
        fileName
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
