import { GraphQLClient } from 'graphql-request';
import { REPORT_PROMPT_RUN } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  QueueStatus,
  ChatCompletionRole,
  PromptRunProductArea,
  LargeLanguageModelClient,
} from '@transcend-io/privacy-types';

/**
 * Interface of metadata that can be passed for logging purposes
 * via the Transcend Pathfinder
 */
export interface PathfinderPromptRunMetadata {
  /** Unique name for the current prompt run */
  promptRunName?: string;
  /** ID of the Transcend prompt being reported */
  promptId?: string;
  /** Title of the prompt being reported on */
  promptTitle?: string;
  /** The ID of the prompt group being reported */
  promptGroupId?: string;
  /** The title of the prompt group being reported */
  promptGroupTitle?: string;
  /** Employee email that is executing the request */
  runByEmployeeEmail?: string;
  /** ID of the application calling pathfinder  */
  applicationId?: string;
  /** Name of the application calling pathfinder  */
  applicationName?: string;
}

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
  promptId?: string;
  /** Title of the prompt being reported on */
  promptTitle?: string;
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
  /** The ID of the prompt group being reported */
  promptGroupId?: string;
  /** The title of the prompt group being reported */
  promptGroupTitle?: string;
  /** The LLM Id being reported on */
  largeLanguageModelId?: string;
  /** The name of the large language model being reported on */
  largeLanguageModelName?: string;
  /** The name of the large language model client reported on */
  largeLanguageModelClient?: LargeLanguageModelClient;
  /** ID of the application calling pathfinder  */
  applicationId?: string;
  /** Name of the application calling pathfinder  */
  applicationName?: string;
  /** ID of the pathfinder applying policies  */
  pathfinderId?: string;
  /** Name of the pathfinder applying policies  */
  pathfinderName?: string;
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
