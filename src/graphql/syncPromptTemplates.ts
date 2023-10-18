import { PromptTemplateInput } from '../codecs';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_PROMPT_TEMPLATES, CREATE_PROMPT_TEMPLATE } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { map } from 'bluebird';
import { fetchAllPromptTemplates } from './fetchPromptTemplates';
import keyBy from 'lodash/keyBy';
import { logger } from '../logger';

/**
 * Create a new prompt template
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @returns Prompt template ID
 */
export async function createPromptTemplate(
  client: GraphQLClient,
  input: {
    /** Title of prompt template */
    title: string;
    /** Prompt content */
    content: string;
  },
): Promise<string> {
  const {
    createPromptTemplate: { promptTemplate },
  } = await makeGraphQLRequest<{
    /** createPromptTemplate mutation */
    createPromptTemplate: {
      /** Prompt template */
      promptTemplate: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_PROMPT_TEMPLATE, {
    input,
  });
  logger.info(
    colors.green(`Successfully created prompt template "${input.title}"!`),
  );
  return promptTemplate.id;
}

/**
 * Update a set of existing prompt templates
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 */
export async function updatePromptTemplates(
  client: GraphQLClient,
  input: [PromptTemplateInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_PROMPT_TEMPLATES, {
    input: {
      promptTemplates: input.map(([input, id]) => ({
        ...input,
        id,
      })),
    },
  });
  logger.info(
    colors.green(`Successfully updated ${input.length} prompt templates!`),
  );
}

/**
 * Sync the prompt templates
 *
 * @param client - GraphQL client
 * @param promptTemplates - PromptTemplates
 * @param concurrency - Concurrency
 * @returns True if synced successfully
 */
export async function syncPromptTemplates(
  client: GraphQLClient,
  promptTemplates: PromptTemplateInput[],
  concurrency = 20,
): Promise<boolean> {
  let encounteredError = false;
  logger.info(
    colors.magenta(`Syncing "${promptTemplates.length}" prompt templates...`),
  );

  // Index existing prompt templates
  const existing = await fetchAllPromptTemplates(client);
  const promptTemplateByTitle = keyBy(existing, 'title');

  // Determine which promptTemplates are new vs existing
  const mapPromptTemplatesToExisting = promptTemplates.map((promptInput) => [
    promptInput,
    promptTemplateByTitle[promptInput.title]?.id,
  ]);

  // Create the new promptTemplates
  const newPromptTemplates = mapPromptTemplatesToExisting
    .filter(([, existing]) => !existing)
    .map(([promptInput]) => promptInput as PromptTemplateInput);
  try {
    logger.info(
      colors.magenta(
        `Creating "${newPromptTemplates.length}" new prompt templates...`,
      ),
    );
    await map(
      newPromptTemplates,
      async (prompt) => {
        await createPromptTemplate(client, prompt);
      },
      {
        concurrency,
      },
    );
    logger.info(
      colors.green(
        `Successfully synced ${newPromptTemplates.length} prompt templates!`,
      ),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(`Failed to create prompt templates! - ${err.message}`),
    );
  }

  // Update existing promptTemplates
  const existingPromptTemplates = mapPromptTemplatesToExisting.filter(
    (x): x is [PromptTemplateInput, string] => !!x[1],
  );
  try {
    logger.info(
      colors.magenta(
        `Updating "${existingPromptTemplates.length}" prompt templates...`,
      ),
    );
    await updatePromptTemplates(client, existingPromptTemplates);
    logger.info(
      colors.green(
        `Successfully updated "${existingPromptTemplates.length}" prompt templates!`,
      ),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(`Failed to create prompt templates! - ${err.message}`),
    );
  }

  logger.info(
    colors.green(`Synced "${promptTemplates.length}" prompt templates!`),
  );

  // Return true upon success
  return !encounteredError;
}
