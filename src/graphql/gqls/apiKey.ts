import { gql } from 'graphql-request';

export const API_KEYS = gql`
  query SchemaSyncApiKeys($first: Int!, $offset: Int!, $titles: [String!]) {
    apiKeys(first: $first, offset: $offset, filterBy: { titles: $titles }) {
      nodes {
        id
        title
      }
    }
  }
`;
