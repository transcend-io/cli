import { AgentFileInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { mapSeries } from 'bluebird';
import { UPDATE_AGENT_FILES, CREATE_AGENT_FILE } from './gqls';
import { logger } from '../logger';
import keyBy from 'lodash/keyBy';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import colors from 'colors';
import { fetchAllAgentFiles, AgentFile } from './fetchAllAgentFiles';

/**
 * Input to create a new agent file
 *
 * @param client - GraphQL client
 * @param agentFile - Input
 */
export async function createAgentFile(
  client: GraphQLClient,
  agentFile: AgentFileInput,
): Promise<Pick<AgentFile, 'id' | 'name' | 'fileId'>> {
  const input = {
    name: agentFile.name,
    description: agentFile.description,
    fileId: agentFile.fileId,
    size: agentFile.size,
    purpose: agentFile.purpose,
    fileUploadedAt: new Date(),
    agentIds: [],
  };

  const { createAgentFile } = await makeGraphQLRequest<{
    /** Create agent file mutation */
    createAgentFile: {
      /** Created agent file */
      agentFile: AgentFile;
    };
  }>(client, CREATE_AGENT_FILE, {
    input,
  });
  return createAgentFile.agentFile;
}

/**
 * Input to update agent files
 *
 * @param client - GraphQL client
 * @param agentFileIdPairs - [AgentFileInput, agentFileId] list
 */
export async function updateAgentFiles(
  client: GraphQLClient,
  agentFileIdPairs: [AgentFileInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_AGENT_FILES, {
    input: {
      agentFiles: agentFileIdPairs.map(([agentFile, id]) => ({
        id,
        name: agentFile.name,
        description: agentFile.description,
        fileId: agentFile.fileId,
        size: agentFile.size,
        purpose: agentFile.purpose,
      })),
    },
  });
}

/**
 * Sync the data inventory agent files
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncAgentFiles(
  client: GraphQLClient,
  inputs: AgentFileInput[],
): Promise<boolean> {
  // Fetch existing
  logger.info(colors.magenta(`Syncing "${inputs.length}" agent files...`));

  let encounteredError = false;

  // Fetch existing
  const existingAgentFiles = await fetchAllAgentFiles(client);

  // Look up by name
  const agentFileByName: {
    [k in string]: Pick<AgentFile, 'id' | 'name' | 'fileId'>;
  } = keyBy(existingAgentFiles, 'name');

  // Create new agent files
  const newAgentFiles = inputs.filter((input) => !agentFileByName[input.name]);

  // Create new agent files
  await mapSeries(newAgentFiles, async (agentFile) => {
    try {
      const newAgentFile = await createAgentFile(client, agentFile);
      agentFileByName[newAgentFile.name] = newAgentFile;
      logger.info(
        colors.green(`Successfully synced agent file "${agentFile.name}"!`),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to sync agent file "${agentFile.name}"! - ${err.message}`,
        ),
      );
    }
  });

  // Update all agent files
  try {
    logger.info(colors.magenta(`Updating "${inputs.length}" agent files!`));
    await updateAgentFiles(
      client,
      inputs.map((input) => [input, agentFileByName[input.name].id]),
    );
    logger.info(
      colors.green(`Successfully synced "${inputs.length}" agent files!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(
        `Failed to sync "${inputs.length}" agent files! - ${err.message}`,
      ),
    );
  }

  return !encounteredError;
}
