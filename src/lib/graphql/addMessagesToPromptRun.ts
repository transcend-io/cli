import { ChatCompletionRole, QueueStatus } from '@transcend-io/privacy-types';
import { GraphQLClient } from 'graphql-request';
import { ADD_MESSAGES_TO_PROMPT_RUN } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface AddMessagesToPromptRunInput {
  /** ID of run */
  promptRunId:
    | {
        /** Report by prompt run name */
        name: string;
        /** Don't report by ID */
        id?: undefined;
      }
    | {
        /** Don't report by name */
        name?: undefined;
        /** Report by prompt run ID */
        id: string;
      };
  /** Messages to report on */
  promptRunMessages?: {
    /** Message reported */
    content: string;
    /** Role of message */
    role: ChatCompletionRole;
    /** Template used if created from prompt */
    template?: string;
  }[];
  /** Error message (if one exists) */
  error?: string;
  /** The status of the run */
  status?: QueueStatus;
  /** Duration of time that it took to execute the prompt */
  duration?: number;
}

/**
 * Record a new prompt run
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @returns Prompt ID
 */
export async function addMessagesToPromptRun(
  client: GraphQLClient,
  { promptRunId, promptRunMessages = [], ...rest }: AddMessagesToPromptRunInput,
): Promise<string> {
  const {
    addMessagesToPromptRun: { promptRun },
  } = await makeGraphQLRequest<{
    /** addMessagesToPromptRun mutation */
    addMessagesToPromptRun: {
      /** Prompt */
      promptRun: {
        /** ID */
        id: string;
      };
    };
  }>(client, ADD_MESSAGES_TO_PROMPT_RUN, {
    input: {
      ...rest,
      ...promptRunId,
      promptRunMessages: promptRunMessages.map(({ content, ...rest }) => ({
        ...rest,
        message: content,
      })),
    },
  });
  return promptRun.id;
}
