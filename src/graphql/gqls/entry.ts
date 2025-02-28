import { gql } from 'graphql-request';

export const ENTRY_COUNT = gql`
  query TranscendCliEntryCount(
    $filterBy: UnstructuredSubDataPointRecommendationsFilterInput
  ) {
    unstructuredSubDataPointRecommendations(filterBy: $filterBy) {
      totalCount
    }
  }
`;
