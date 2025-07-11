import { PromptPartialInput } from '../../codecs';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_PROMPT_PARTIALS, CREATE_PROMPT_PARTIAL } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { map } from '@/lib/bluebird-replace';
import { fetchAllPromptPartials } from './fetchPromptPartials';
import { keyBy } from 'lodash-es';
import { logger } from '../../logger';

/**
 * Create a new prompt partial
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @returns Prompt partial ID
 */
export async function createPromptPartial(
  client: GraphQLClient,
  input: {
    /** Title of prompt partial */
    title: string;
    /** Prompt content */
    content: string;
  },
): Promise<string> {
  const {
    createPromptPartial: { promptPartial },
  } = await makeGraphQLRequest<{
    /** createPromptPartial mutation */
    createPromptPartial: {
      /** Prompt partial */
      promptPartial: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_PROMPT_PARTIAL, {
    input,
  });
  logger.info(
    colors.green(`Successfully created prompt partial "${input.title}"!`),
  );
  return promptPartial.id;
}

/**
 * Update a set of existing prompt partials
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 */
export async function updatePromptPartials(
  client: GraphQLClient,
  input: [PromptPartialInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_PROMPT_PARTIALS, {
    input: {
      promptPartials: input.map(([input, id]) => ({
        ...input,
        id,
      })),
    },
  });
  logger.info(
    colors.green(`Successfully updated ${input.length} prompt partials!`),
  );
}

/**
 * Sync the prompt partials
 *
 * @param client - GraphQL client
 * @param promptPartials - PromptPartials
 * @param concurrency - Concurrency
 * @returns True if synced successfully
 */
export async function syncPromptPartials(
  client: GraphQLClient,
  promptPartials: PromptPartialInput[],
  concurrency = 20,
): Promise<boolean> {
  let encounteredError = false;
  logger.info(
    colors.magenta(`Syncing "${promptPartials.length}" prompt partials...`),
  );

  // Index existing prompt partials
  const existing = await fetchAllPromptPartials(client);
  const promptPartialByTitle = keyBy(existing, 'title');

  // Determine which promptPartials are new vs existing
  const mapPromptPartialsToExisting = promptPartials.map((promptInput) => [
    promptInput,
    promptPartialByTitle[promptInput.title]?.id,
  ]);

  // Create the new promptPartials
  const newPromptPartials = mapPromptPartialsToExisting
    .filter(([, existing]) => !existing)
    .map(([promptInput]) => promptInput as PromptPartialInput);
  try {
    logger.info(
      colors.magenta(
        `Creating "${newPromptPartials.length}" new prompt partials...`,
      ),
    );
    await map(
      newPromptPartials,
      async (prompt) => {
        await createPromptPartial(client, prompt);
      },
      {
        concurrency,
      },
    );
    logger.info(
      colors.green(
        `Successfully synced ${newPromptPartials.length} prompt partials!`,
      ),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(`Failed to create prompt partials! - ${err.message}`),
    );
  }

  // Update existing promptPartials
  const existingPromptPartials = mapPromptPartialsToExisting.filter(
    (x): x is [PromptPartialInput, string] => !!x[1],
  );
  try {
    logger.info(
      colors.magenta(
        `Updating "${existingPromptPartials.length}" prompt partials...`,
      ),
    );
    await updatePromptPartials(client, existingPromptPartials);
    logger.info(
      colors.green(
        `Successfully updated "${existingPromptPartials.length}" prompt partials!`,
      ),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(`Failed to create prompt partials! - ${err.message}`),
    );
  }

  logger.info(
    colors.green(`Synced "${promptPartials.length}" prompt partials!`),
  );

  // Return true upon success
  return !encounteredError;
}
