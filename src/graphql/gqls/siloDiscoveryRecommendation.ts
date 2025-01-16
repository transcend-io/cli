import { gql } from 'graphql-request';

export const SILO_DISCOVERY_RECOMMENDATIONS = gql`
  query TranscendCliSiloDiscoveryRecommendations(
    $first: Int
    $input: SiloDiscoveryRecommendationsInput!
    $filterBy: SiloDiscoveryRecommendationFiltersInput
  ) {
    vendors(
      first: $first
      offset: $offset
      useMaster: false
      isExportCsv: true
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: title, direction: ASC }
      ]
    ) {
      nodes {
        title
        resourceId
        lastDiscoveredAt
        suggestedCatalog {
          title
        }
      }
    }
  }
`;
