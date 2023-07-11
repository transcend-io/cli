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
        regionList
        regionDetectionMethod
        waitingPeriod
      }
    }
  }
`;

export const UPDATE_ACTION = gql`
  mutation TranscendCliUpdateAction($input: UpdateActionInput!) {
    updateAction(input: $input) {
      clientMutationId
    }
  }
`;
