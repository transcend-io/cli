import { gql } from 'graphql-request';

export const REPORT_PROMPT_RUN = gql`
  mutation TranscendCliReportPromptRun($input: ReportPromptRunInput!) {
    reportPromptRun(input: $input) {
      clientMutationId
      promptRun {
        id
      }
    }
  }
`;

export const ADD_MESSAGES_TO_PROMPT_RUN = gql`
  mutation TranscendCliAddMessagesToPromptRun(
    $input: AddMessagesToPromptRunInput!
  ) {
    addMessagesToPromptRun(input: $input) {
      clientMutationId
      promptRun {
        id
      }
    }
  }
`;
