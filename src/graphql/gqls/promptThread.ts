import { gql } from 'graphql-request';

export const PROMPT_THREADS = gql`
  query TranscendCliPromptThreads(
    $first: Int!
    $offset: Int!
    $filterBy: PromptThreadFiltersInput!
  ) {
    promptThreads(first: $first, offset: $offset, filterBy: $filterBy) {
      nodes {
        id
        threadId
        slackMessageTs
        slackTeamId
        slackChannelId
        slackChannelName
      }
    }
  }
`;
