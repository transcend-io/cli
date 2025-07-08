import { GraphQLClient } from 'graphql-request';
import { PROMPT_PARTIALS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface PromptPartial {
  /** ID of prompts */
  id: string;
  /** The title of the prompt partial. */
  title: string;
  /** The content of the prompt partial. */
  content: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all PromptPartials in the organization
 *
 * @param client - GraphQL client
 * @returns All PromptPartials in the organization
 */
export async function fetchAllPromptPartials(
  client: GraphQLClient,
): Promise<PromptPartial[]> {
  const promptPartials: PromptPartial[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      promptPartials: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** PromptPartials */
      promptPartials: {
        /** List */
        nodes: PromptPartial[];
      };
    }>(client, PROMPT_PARTIALS, {
      first: PAGE_SIZE,
      offset,
    });
    promptPartials.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return promptPartials.sort((a, b) => a.title.localeCompare(b.title));
}
