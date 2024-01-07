import { AgentInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { mapSeries } from 'bluebird';
import { UPDATE_AGENTS, CREATE_AGENT } from './gqls';
import { logger } from '../logger';
import keyBy from 'lodash/keyBy';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import colors from 'colors';
import { fetchAllAgents, Agent } from './fetchAllAgents';
import { Prompt, fetchAllPrompts } from './fetchPrompts';
import {
  LargeLanguageModel,
  fetchAllLargeLanguageModels,
} from './fetchLargeLanguageModels';

/**
 * Input to create a new agent
 *
 * @param client - GraphQL client
 * @param agent - Input
 * @param promptByTitle - Prompt lookup
 * @param largeLanguageModelLookup - Model lookup
 */
export async function createAgent(
  client: GraphQLClient,
  agent: AgentInput,
  promptByTitle: { [k in string]: Prompt },
  largeLanguageModelLookup: { [k in string]: LargeLanguageModel },
): Promise<Pick<Agent, 'id' | 'name' | 'agentId'>> {
  const input = {
    name: agent.name,
    description: agent.description,
    codeInterpreterEnabled: agent.codeInterpreterEnabled,
    retrievalEnabled: agent.retrievalEnabled,
    promptId: promptByTitle[agent.prompt].id,
    largeLanguageModelId:
      largeLanguageModelLookup[
        `${agent['large-language-model'].name}:${agent['large-language-model'].client}`
      ].id,
    // TODO: https://transcend.height.app/T-31995 - prompt, largeLanguageModel, agentFunction, agentFile
  };

  const { createAgent } = await makeGraphQLRequest<{
    /** Create agent mutation */
    createAgent: {
      /** Created agent */
      agent: Agent;
    };
  }>(client, CREATE_AGENT, {
    input,
  });
  return createAgent.agent;
}

/**
 * Input to update agents
 *
 * @param client - GraphQL client
 * @param agentIdParis - [AgentInput, agentId] list
 */
export async function updateAgents(
  client: GraphQLClient,
  agentIdParis: [AgentInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_AGENTS, {
    input: {
      agents: agentIdParis.map(([agent, id]) => ({
        id,
        name: agent.name,
        description: agent.description,
        codeInterpreterEnabled: agent.codeInterpreterEnabled,
        retrievalEnabled: agent.retrievalEnabled,
        // TODO: https://transcend.height.app/T-31995 - prompt, largeLanguageModel, agentFunction, agentFile
      })),
    },
  });
}

/**
 * Sync the data inventory agents
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncAgents(
  client: GraphQLClient,
  inputs: AgentInput[],
): Promise<boolean> {
  // Fetch existing
  logger.info(colors.magenta(`Syncing "${inputs.length}" agents...`));

  let encounteredError = false;

  // Fetch existing
  const existingAgents = await fetchAllAgents(client);

  // Look up by name
  const agentByName: {
    [k in string]: Pick<Agent, 'id' | 'name' | 'agentId'>;
  } = keyBy(existingAgents, 'name');

  // index prompts & models
  // TODO: https://transcend.height.app/T-31995 - remove this
  const prompts = await fetchAllPrompts(client);
  const promptByTitle = keyBy(prompts, 'title');
  const models = await fetchAllLargeLanguageModels(client);
  const largeLanguageModelLookup = keyBy(
    models,
    ({ name, client }) => `${name}:${client}`,
  );

  // Create new agents
  const newAgents = inputs.filter((input) => !agentByName[input.name]);

  // Create new agents
  await mapSeries(newAgents, async (agent) => {
    try {
      const newAgent = await createAgent(
        client,
        agent,
        promptByTitle,
        largeLanguageModelLookup,
      );
      agentByName[newAgent.name] = newAgent;
      logger.info(colors.green(`Successfully synced agent "${agent.name}"!`));
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(`Failed to sync agent "${agent.name}"! - ${err.message}`),
      );
    }
  });

  // Update all agents
  try {
    logger.info(colors.magenta(`Updating "${inputs.length}" agents!`));
    await updateAgents(
      client,
      inputs.map((input) => [input, agentByName[input.name].id]),
    );
    logger.info(colors.green(`Successfully synced "${inputs.length}" agents!`));
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(`Failed to sync "${inputs.length}" agents ! - ${err.message}`),
    );
  }

  return !encounteredError;
}
