import { GraphQLClient } from 'graphql-request';
import { AGENTS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { LargeLanguageModelClient } from '@transcend-io/privacy-types';

export interface Agent {
  /** ID of agent */
  id: string;
  /** Name of agent */
  name: string;
  /** The ID of the agent */
  agentId: string;
  /** Description of the agent */
  description: string;
  /** Whether the agent has code interpreter enabled */
  codeInterpreterEnabled: boolean;
  /** Whether the agent has retrieval enabled */
  retrievalEnabled: boolean;
  /** The prompt that the agent is based on */
  prompt: {
    /** Title of the prompt */
    title: string;
  };
  /** Large language model that the agent is based on */
  largeLanguageModel: {
    /** Name of model */
    name: string;
    /** Client */
    client: LargeLanguageModelClient;
  };
  /** Teams assigned to the agent */
  teams: {
    /** Team name */
    name: string;
  }[];
  /** Users assigned to the agent */
  owners: {
    /** User email */
    email: string;
  }[];
  /** Functions that the agent has access to */
  agentFunctions: {
    /** Function name */
    name: string;
  }[];
  /** Files that the agent has access to */
  agentFiles: {
    /** File name */
    name: string;
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all agents in the organization
 *
 * @param client - GraphQL client
 * @param filterBy - Filter by
 * @returns All agents in the organization
 */
export async function fetchAllAgents(
  client: GraphQLClient,
  filterBy: {
    /** Names of the agents to filter for */
    agentNames?: string[];
  } = {},
): Promise<Agent[]> {
  const agents: Agent[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      agents: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Agents */
      agents: {
        /** List */
        nodes: Agent[];
      };
    }>(client, AGENTS, {
      first: PAGE_SIZE,
      offset,
      filterBy,
    });
    agents.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}
