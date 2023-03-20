import { gql } from 'graphql-request';

export const ACTIONS = gql`
  query TranscendCliActions($first: Int!, $offset: Int!) {
    actions(first: $first, offset: $offset) {
      nodes {
        id
        type
        skipSecondaryIfNoFiles
        skipDownloadableStep
        requiresReview
        waitingPeriod
      }
    }
  }
`;
