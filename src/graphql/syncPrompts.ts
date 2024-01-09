import { PromptInput } from '../codecs';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_PROMPTS, CREATE_PROMPT } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { map } from 'bluebird';
import { fetchAllPrompts } from './fetchPrompts';
import keyBy from 'lodash/keyBy';
import { logger } from '../logger';

/**
 * Create a new prompt
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @returns Prompt ID
 */
export async function createPrompt(
  client: GraphQLClient,
  input: {
    /** Title of prompt */
    title: string;
    /** Prompt content */
    content: string;
  },
): Promise<string> {
  const {
    createPrompt: { prompt },
  } = await makeGraphQLRequest<{
    /** createPrompt mutation */
    createPrompt: {
      /** Prompt */
      prompt: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_PROMPT, {
    // TODO: https://transcend.height.app/T-31994 - include models and groups, teams, users
    input,
  });
  logger.info(colors.green(`Successfully created prompt "${input.title}"!`));
  return prompt.id;
}

/**
 * Update a set of existing prompts
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 */
export async function updatePrompts(
  client: GraphQLClient,
  input: [PromptInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_PROMPTS, {
    input: {
      prompts: input.map(([input, id]) => ({
        ...input,
        id,
      })),
    },
  });
  logger.info(colors.green(`Successfully updated ${input.length} prompts!`));
}

/**
 * Sync the prompts
 *
 * @param client - GraphQL client
 * @param prompts - Prompts
 * @param concurrency - Concurrency
 * @returns True if synced successfully
 */
export async function syncPrompts(
  client: GraphQLClient,
  prompts: PromptInput[],
  concurrency = 20,
): Promise<boolean> {
  let encounteredError = false;
  logger.info(colors.magenta(`Syncing "${prompts.length}" prompts...`));

  // Index existing prompts
  const existing = await fetchAllPrompts(client);
  const promptByTitle = keyBy(existing, 'title');

  // Determine which prompts are new vs existing
  const mapPromptsToExisting = prompts.map((promptInput) => [
    promptInput,
    promptByTitle[promptInput.title]?.id,
  ]);

  // Create the new prompts
  const newPrompts = mapPromptsToExisting
    .filter(([, existing]) => !existing)
    .map(([promptInput]) => promptInput as PromptInput);
  try {
    logger.info(
      colors.magenta(`Creating "${newPrompts.length}" new prompts...`),
    );
    await map(
      newPrompts,
      async (prompt) => {
        await createPrompt(client, prompt);
      },
      {
        concurrency,
      },
    );
    logger.info(
      colors.green(`Successfully synced ${newPrompts.length} prompts!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create prompts! - ${err.message}`));
  }

  // Update existing prompts
  const existingPrompts = mapPromptsToExisting.filter(
    (x): x is [PromptInput, string] => !!x[1],
  );
  try {
    logger.info(
      colors.magenta(`Updating "${existingPrompts.length}" prompts...`),
    );
    await updatePrompts(client, existingPrompts);
    logger.info(
      colors.green(`Successfully updated "${existingPrompts.length}" prompts!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create prompts! - ${err.message}`));
  }

  logger.info(colors.green(`Synced "${prompts.length}" prompts!`));

  // Return true upon success
  return !encounteredError;
}
