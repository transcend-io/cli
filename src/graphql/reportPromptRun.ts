import { GraphQLClient } from 'graphql-request';
import { REPORT_PROMPT_RUN } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  QueueStatus,
  ChatCompletionRole,
  PromptRunProductArea,
} from '@transcend-io/privacy-types';

export interface ReportPromptRunInput {
  /** Name of run */
  name: string;
  /** The related product area being uploaded to */
  productArea: PromptRunProductArea;
  /** Messages reported on */
  promptRunMessages: {
    /** Message reported */
    content: string;
    /** Role of message */
    role: ChatCompletionRole;
    /** Template used if created from prompt */
    template?: string;
  }[];
  /** ID of the Transcend prompt being reported */
  promptId: string;
  /** Error message (if one exists) */
  error?: string;
  /** The status of the run */
  status?: QueueStatus;
  /** Employee email that is executing the request */
  runByEmployeeEmail?: string;
  /** Duration of time that it took to execute the prompt */
  duration?: number;
  /** Temperature used when running prompt */
  temperature?: number;
  /** TopP parameter used when running prompt */
  topP?: number;
  /** Max tokens ot sample parameter used when running prompt */
  maxTokensToSample?: number;
  /** The prompt group being reported */
  promptGroupId?: string;
  /** The LLM Id being reported on */
  largeLanguageModelId?: string;
}

/**
 * Record a new prompt run
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @returns Prompt ID
 */
export async function reportPromptRun(
  client: GraphQLClient,
  input: ReportPromptRunInput,
): Promise<string> {
  const {
    reportPromptRun: { promptRun },
  } = await makeGraphQLRequest<{
    /** reportPromptRun mutation */
    reportPromptRun: {
      /** Prompt */
      promptRun: {
        /** ID */
        id: string;
      };
    };
  }>(client, REPORT_PROMPT_RUN, {
    input: {
      ...input,
      promptRunMessages: input.promptRunMessages.map(
        ({ content, ...rest }) => ({
          ...rest,
          message: content,
        }),
      ),
    },
  });
  return promptRun.id;
}
