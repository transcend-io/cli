import { ScopeName } from '@transcend-io/privacy-types';
import { GraphQLClient } from 'graphql-request';
import { TEAMS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Team {
  /** ID of team */
  id: string;
  /** Name of team */
  name: string;
  /** Description of team */
  description: string;
  /** SSO department for automated provisioning */
  ssoDepartment?: string;
  /** SSO group name for automated provisioning */
  ssoGroup?: string;
  /** SSO title mapping for automated provisioning */
  ssoTitle?: string;
  /** List of users on the team */
  users: {
    /** ID of user */
    id: string;
    /** Email of user */
    email: string;
    /** Name of user */
    name: string;
  }[];
  /** List of scopes on the team */
  scopes: {
    /** ID of scope */
    id: string;
    /** Name of scope */
    name: ScopeName;
    /** Title of scope */
    title: string;
  }[];
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
