import { gql } from 'graphql-request';

export const CATALOGS = gql`
  query TranscendCliCatalogs($first: Int!, $offset: Int!) {
    catalogs(first: $first, offset: $offset, filterBy: {}) {
      nodes {
        integrationName
        title
        hasApiFunctionality
      }
    }
  }
`;
