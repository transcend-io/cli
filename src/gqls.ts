import { gql } from 'graphql-request';

export const ENRICHERS = gql`
  {
    query SchemaSyncEnrichers(title: String!) {
      enrichers(filterBy: { text: $title }) {
        nodes {
          id
          title
          inputIdentifier {
            name
          }
          identifiers {
            name
          }
        }
      }
    }
  }
`;
