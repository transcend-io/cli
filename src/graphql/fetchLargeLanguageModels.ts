import { GraphQLClient } from 'graphql-request';
import { LargeLanguageModelClient } from '@transcend-io/privacy-types';
import { PROMPT_TEMPLATES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface LargeLanguageModel {
  /** ID of prompts */
  id: string;
  /** The name of the large language model. */
  name: string;
  /** The content of the prompt template. */
  client: LargeLanguageModelClient;
  /** Whether hosted by Transcend or not */
  isTranscendHosted: boolean;
}

const PAGE_SIZE = 20;

/**
 * Fetch all LargeLanguageModels in the organization
 *
 * @param client - GraphQL client
 * @returns All LargeLanguageModels in the organization
 */
export async function fetchAllLargeLanguageModels(
  client: GraphQLClient,
): Promise<LargeLanguageModel[]> {
  const largeLanguageModels: LargeLanguageModel[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      largeLanguageModels: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** LargeLanguageModels */
      largeLanguageModels: {
        /** List */
        nodes: LargeLanguageModel[];
      };
    }>(client, PROMPT_TEMPLATES, {
      first: PAGE_SIZE,
      offset,
    });
    largeLanguageModels.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return largeLanguageModels.sort((a, b) => a.name.localeCompare(b.name));
}
