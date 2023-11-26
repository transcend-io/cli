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
