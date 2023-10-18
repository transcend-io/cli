import { GraphQLClient } from 'graphql-request';
import { PROMPT_TEMPLATES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface PromptTemplate {
  /** ID of prompts */
  id: string;
  /** The title of the prompt template. */
  title: string;
  /** The content of the prompt template. */
  content: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all PromptTemplates in the organization
 *
 * @param client - GraphQL client
 * @returns All PromptTemplates in the organization
 */
export async function fetchAllPromptTemplates(
  client: GraphQLClient,
): Promise<PromptTemplate[]> {
  const promptTemplates: PromptTemplate[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      promptTemplates: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** PromptTemplates */
      promptTemplates: {
        /** List */
        nodes: PromptTemplate[];
      };
    }>(client, PROMPT_TEMPLATES, {
      first: PAGE_SIZE,
      offset,
    });
    promptTemplates.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return promptTemplates.sort((a, b) => a.title.localeCompare(b.title));
}
