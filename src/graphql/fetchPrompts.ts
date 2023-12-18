import { GraphQLClient } from 'graphql-request';
import { PROMPTS, PROMPTS_WITH_VARIABLES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  AssessmentStatus,
  PromptResponseFormat,
} from '@transcend-io/privacy-types';

export interface Prompt {
  /** ID of prompt */
  id: string;
  /** The title of the prompt */
  title: string;
  /** The status of the prompt  */
  status: AssessmentStatus;
  /** The content of the prompt */
  content: string;
  /** Temperature to use with prompt */
  temperature: number;
  /** Top P to use with prompt */
  topP: number;
  /** Max tokens to sample for prompt */
  maxTokensToSample: number;
}

const PAGE_SIZE = 20;

/**
 * Fetch all Prompts in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All Prompts in the organization
 */
export async function fetchAllPrompts(
  client: GraphQLClient,
  {
    text,
    titles = [],
    ids = [],
  }: {
    /** Filter by text */
    text?: string;
    /** Filter by ids */
    ids?: string[];
    /** Filter by titles */
    titles?: string[];
  } = {},
): Promise<Prompt[]> {
  const prompts: Prompt[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      prompts: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Prompts */
      prompts: {
        /** List */
        nodes: Prompt[];
      };
    }>(client, PROMPTS, {
      first: PAGE_SIZE,
      offset,
      filterBy: {
        ...(text ? { text } : {}),
        ...(titles.length > 0 ? { title: titles } : {}),
        ...(ids.length > 0 ? { id: ids } : {}),
      },
    });
    prompts.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return prompts.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * The basic metadata needed to use a prompt at runtime
 */
export type TranscendPromptTemplated = {
  /** ID of prompt */
  id: string;
  /** Title of prompt */
  title: string;
  /** Content of prompt */
  content: string;
  /** Status of prompt */
  status: AssessmentStatus;
  /** Temperature */
  temperature?: number;
  /** Top P */
  topP?: number;
  /** Max tokens to sample */
  maxTokensToSample?: number;
  /** Response format */
  responseFormat?: PromptResponseFormat;
};

/**
 * The basic metadata needed to use a prompt partial at runtime
 */
export type TranscendPromptPartialTemplated = {
  /** ID of prompt */
  id: string;
  /** Title of prompt */
  title: string;
  /** Slug of prompt */
  slug: string;
  /** Content of prompt */
  content: string;
};

/**
 * Calculated variables
 */
export type PromptCalculatedVariable = {
  /** JSON stringified data to template */
  data: string | null;
  /** Name of variable */
  name: string;
};

/**
 * Runtime variables
 */
export type PromptRuntimeVariable = {
  /** Type of variable */
  type: string;
  /** Name of variable */
  name: string;
};

/**
 * Metadata useful for filling variables within a prompt
 */
export type TranscendPromptsAndVariables = {
  /** Prompts ready to be templated */
  prompts: TranscendPromptTemplated[];
  /** Prompt partials */
  promptPartials: TranscendPromptPartialTemplated[];
  /** Calculated variables to be templated */
  calculatedVariables: PromptCalculatedVariable[];
  /** Runtime variables to be templated */
  runtimeVariables: PromptRuntimeVariable[];
};

/**
 * Fetch prompts with templated variables
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Prompts and template variables
 */
export async function fetchPromptsWithVariables(
  client: GraphQLClient,
  {
    promptTitles = [],
    promptIds = [],
  }: {
    /** Filter by prompt ids */
    promptIds?: string[];
    /** Filter by prompt titles */
    promptTitles?: string[];
  } = {},
): Promise<TranscendPromptsAndVariables> {
  const { promptsWithVariables } = await makeGraphQLRequest<{
    /** Prompts */
    promptsWithVariables: TranscendPromptsAndVariables;
  }>(client, PROMPTS_WITH_VARIABLES, {
    input: {
      ...(promptTitles.length > 0 ? { promptTitles } : {}),
      ...(promptIds.length > 0 ? { promptIds } : {}),
    },
  });

  return promptsWithVariables;
}
