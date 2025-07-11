import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// TODO: https://transcend.height.app/T-27909 - order by createdAt
export const ACTIONS = gql`
  query TranscendCliActions($first: Int!, $offset: Int!) {
    actions(
      first: $first
      offset: $offset
      useMaster: false
      orderBy: [{ field: type, direction: ASC }]
    ) {
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
