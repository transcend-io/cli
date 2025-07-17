import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';
import { PromptGroupInput } from '../../codecs';
import { logger } from '../../logger';
import { map } from '../bluebird-replace';
import { fetchAllPromptGroups } from './fetchPromptGroups';
import { fetchAllPrompts } from './fetchPrompts';
import { CREATE_PROMPT_GROUP, UPDATE_PROMPT_GROUPS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

interface EditPromptGroupInput {
  /** Title of prompt group */
  title: string;
  /** Prompt group description */
  description: string;
  /** Prompt IDs */
  promptIds: string[];
}

/**
 * Create a new prompt group
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @returns Prompt group ID
 */
async function createPromptGroup(
  client: GraphQLClient,
  input: EditPromptGroupInput,
): Promise<string> {
  const {
    createPromptGroup: { promptGroup },
  } = await makeGraphQLRequest<{
    /** createPromptGroup mutation */
    createPromptGroup: {
      /** Prompt group */
      promptGroup: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_PROMPT_GROUP, {
    input,
  });
  logger.info(
    colors.green(`Successfully created prompt group "${input.title}"!`),
  );
  return promptGroup.id;
}

/**
 * Update a set of existing prompt groups
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 */
async function updatePromptGroups(
  client: GraphQLClient,
  input: [EditPromptGroupInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_PROMPT_GROUPS, {
    input: {
      promptGroups: input.map(([input, id]) => ({
        ...input,
        id,
      })),
    },
  });
  logger.info(
    colors.green(`Successfully updated ${input.length} prompt groups!`),
  );
}

/**
 * Sync the prompt groups
 *
 * @param client - GraphQL client
 * @param promptGroups - PromptGroups
 * @param concurrency - Concurrency
 * @returns True if synced successfully
 */
export async function syncPromptGroups(
  client: GraphQLClient,
  promptGroups: PromptGroupInput[],
  concurrency = 20,
): Promise<boolean> {
  let encounteredError = false;
  logger.info(
    colors.magenta(`Syncing "${promptGroups.length}" prompt groups...`),
  );

  // Index existing prompt groups
  const existing = await fetchAllPromptGroups(client);
  const existingPrompts = await fetchAllPrompts(client);
  const promptByTitle = keyBy(existingPrompts, 'title');
  const promptGroupByTitle = keyBy(existing, 'title');

  // Determine which promptGroups are new vs existing
  const mapPromptGroupsToExisting = promptGroups.map((promptInput) => [
    promptInput,
    promptGroupByTitle[promptInput.title]?.id,
  ]);

  // Create the new promptGroups
  const newPromptGroups = mapPromptGroupsToExisting
    .filter(([, existing]) => !existing)
    .map(([promptInput]) => promptInput as PromptGroupInput);
  try {
    logger.info(
      colors.magenta(
        `Creating "${newPromptGroups.length}" new prompt groups...`,
      ),
    );
    await map(
      newPromptGroups,
      async (prompt) => {
        await createPromptGroup(client, {
          ...prompt,
          promptIds: prompt.prompts.map((title) => {
            const prompt = promptByTitle[title];
            if (!prompt) {
              throw new Error(`Failed to find prompt with title: "${title}"`);
            }
            return prompt.id;
          }),
        });
      },
      {
        concurrency,
      },
    );
    logger.info(
      colors.green(
        `Successfully synced ${newPromptGroups.length} prompt groups!`,
      ),
    );
  } catch (error) {
    encounteredError = true;
    logger.info(
      colors.red(`Failed to create prompt groups! - ${error.message}`),
    );
  }

  // Update existing promptGroups
  const existingPromptGroups = mapPromptGroupsToExisting.filter(
    (x): x is [PromptGroupInput, string] => !!x[1],
  );
  try {
    logger.info(
      colors.magenta(
        `Updating "${existingPromptGroups.length}" prompt groups...`,
      ),
    );
    await updatePromptGroups(
      client,
      existingPromptGroups.map(([{ prompts, ...input }, id]) => [
        {
          ...input,
          promptIds: prompts.map((title) => {
            const prompt = promptByTitle[title];
            if (!prompt) {
              throw new Error(`Failed to find prompt with title: "${title}"`);
            }
            return prompt.id;
          }),
        },
        id,
      ]),
    );
    logger.info(
      colors.green(
        `Successfully updated "${existingPromptGroups.length}" prompt groups!`,
      ),
    );
  } catch (error) {
    encounteredError = true;
    logger.info(
      colors.red(`Failed to create prompt groups! - ${error.message}`),
    );
  }

  logger.info(colors.green(`Synced "${promptGroups.length}" prompt groups!`));

  // Return true upon success
  return !encounteredError;
}
