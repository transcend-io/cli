import { gql } from 'graphql-request';

export const SILO_DISCOVERY_RESULTS = gql`
  query TranscendCliSiloDiscoveryResults($first: Int!, $offset: Int!) {
    siloDiscoveryResults(first: $first, offset: $offset) {
      nodes {
        title
        resourceId
        country
        countrySubDivision
        plaintextContext
        containsSensitiveData
        suggestedCatalog {
          title
        }
        plugin {
          dataSilo {
            title
          }
        }
      }
    }
  }
`;
