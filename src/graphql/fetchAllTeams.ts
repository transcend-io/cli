import { GraphQLClient } from 'graphql-request';
import { TEAMS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Team {
  /** ID of team */
  id: string;
  /** Name of team */
  name: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all teams in the organization
 *
 * @param client - GraphQL client
 * @returns All teams in the organization
 */
export async function fetchAllTeams(client: GraphQLClient): Promise<Team[]> {
  const teams: Team[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      teams: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Teams */
      teams: {
        /** List */
        nodes: Team[];
      };
    }>(client, TEAMS, {
      first: PAGE_SIZE,
      offset,
    });
    teams.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return teams.sort((a, b) => a.name.localeCompare(b.name));
}
