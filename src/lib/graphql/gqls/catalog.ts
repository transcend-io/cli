import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - order by createdAt
// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const CATALOGS = gql`
  query TranscendCliCatalogs($first: Int!, $offset: Int!) {
    catalogs(first: $first, offset: $offset, filterBy: {}, useMaster: false) {
      nodes {
        integrationName
        title
        hasApiFunctionality
      }
    }
  }
`;
