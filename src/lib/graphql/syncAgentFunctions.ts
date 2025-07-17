import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';
import { AgentFunctionInput } from '../../codecs';
import { logger } from '../../logger';
import { mapSeries } from '../bluebird-replace';
import {
  AgentFunction,
  fetchAllAgentFunctions,
} from './fetchAllAgentFunctions';
import { CREATE_AGENT_FUNCTION, UPDATE_AGENT_FUNCTIONS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Input to create a new agent function
 *
 * @param client - GraphQL client
 * @param agentFunction - Input
 * @returns Created agent function
 */
export async function createAgentFunction(
  client: GraphQLClient,
  agentFunction: AgentFunctionInput,
): Promise<Pick<AgentFunction, 'id' | 'name'>> {
  const input = {
    name: agentFunction.name,
    description: agentFunction.description,
    parameters: agentFunction.parameters,
    agentIds: [],
    // TODO: https://transcend.height.app/T-31994 - sync agents
  };

  const { createAgentFunction } = await makeGraphQLRequest<{
    /** Create agent function mutation */
    createAgentFunction: {
      /** Created agent function */
      agentFunction: AgentFunction;
    };
  }>(client, CREATE_AGENT_FUNCTION, {
    input,
  });
  return createAgentFunction.agentFunction;
}

/**
 * Input to update agent functions
 *
 * @param client - GraphQL client
 * @param agentFunctionIdPairs - [AgentFunctionInput, agentFunctionId] list
 */
export async function updateAgentFunctions(
  client: GraphQLClient,
  agentFunctionIdPairs: [AgentFunctionInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_AGENT_FUNCTIONS, {
    input: {
      agentFunctions: agentFunctionIdPairs.map(([agentFunction, id]) => ({
        id,
        name: agentFunction.name,
        description: agentFunction.description,
        parameters: agentFunction.parameters,
      })),
    },
  });
}

/**
 * Sync the data inventory agent functions
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncAgentFunctions(
  client: GraphQLClient,
  inputs: AgentFunctionInput[],
): Promise<boolean> {
  // Fetch existing
  logger.info(colors.magenta(`Syncing "${inputs.length}" agent functions...`));

  let encounteredError = false;

  // Fetch existing
  const existingAgentFunctions = await fetchAllAgentFunctions(client);

  // Look up by name
  const agentFunctionByName: {
    [k in string]: Pick<AgentFunction, 'id' | 'name'>;
  } = keyBy(existingAgentFunctions, 'name');

  // Create new agent functions
  const newAgentFunctions = inputs.filter(
    (input) => !agentFunctionByName[input.name],
  );

  // Create new agent functions
  await mapSeries(newAgentFunctions, async (agentFunction) => {
    try {
      const newAgentFunction = await createAgentFunction(client, agentFunction);
      agentFunctionByName[newAgentFunction.name] = newAgentFunction;
      logger.info(
        colors.green(
          `Successfully synced agent function "${agentFunction.name}"!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to sync agent function "${agentFunction.name}"! - ${err.message}`,
        ),
      );
    }
  });

  // Update all agent functions
  try {
    logger.info(colors.magenta(`Updating "${inputs.length}" agent functions!`));
    await updateAgentFunctions(
      client,
      inputs.map((input) => [input, agentFunctionByName[input.name].id]),
    );
    logger.info(
      colors.green(`Successfully synced "${inputs.length}" agent functions!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(
        `Failed to sync "${inputs.length}" agent functions! - ${err.message}`,
      ),
    );
  }

  return !encounteredError;
}
