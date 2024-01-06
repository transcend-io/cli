import { GraphQLClient } from 'graphql-request';
import { AGENT_FILES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { PromptFilePurpose } from '@transcend-io/privacy-types';

export interface AgentFile {
  /** ID of agentFile */
  id: string;
  /** Name of agentFile */
  name: string;
  /** Description of the agentFile */
  description: string;
  /** File ID */
  fileId: string;
  /** File size */
  size: number;
  /** File purpose */
  purpose: PromptFilePurpose;
}

const PAGE_SIZE = 20;

/**
 * Fetch all agentFiles in the organization
 *
 * @param client - GraphQL client
 * @returns All agentFiles in the organization
 */
export async function fetchAllAgentFiles(
  client: GraphQLClient,
): Promise<AgentFile[]> {
  const agentFiles: AgentFile[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      agentFiles: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** AgentFiles */
      agentFiles: {
        /** List */
        nodes: AgentFile[];
      };
    }>(client, AGENT_FILES, {
      first: PAGE_SIZE,
      offset,
    });
    agentFiles.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return agentFiles.sort((a, b) => a.name.localeCompare(b.name));
}
