import { TeamInput } from '../../codecs';
import { GraphQLClient } from 'graphql-request';
import Bluebird from 'bluebird';
const { mapSeries } = Bluebird;
import { UPDATE_TEAM, CREATE_TEAM } from './gqls';
import { logger } from '../../logger';
import { keyBy } from 'lodash-es';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import colors from 'colors';
import { fetchAllTeams, Team } from './fetchAllTeams';

/**
 * Input to create a new team
 *
 * @param client - GraphQL client
 * @param team - Input
 * @returns Created team
 */
export async function createTeam(
  client: GraphQLClient,
  team: TeamInput,
): Promise<Pick<Team, 'id' | 'name'>> {
  const input = {
    name: team.name,
    description: team.description,
    ssoTitle: team['sso-title'],
    ssoDepartment: team['sso-department'],
    ssoGroup: team['sso-group'],
    scopes: team.scopes,
    userEmails: team.users,
  };

  const { createTeam } = await makeGraphQLRequest<{
    /** Create team mutation */
    createTeam: {
      /** Created team */
      team: Team;
    };
  }>(client, CREATE_TEAM, {
    input,
  });
  return createTeam.team;
}

/**
 * Input to update teams
 *
 * @param client - GraphQL client
 * @param input - Team input to update
 * @param teamId - ID of team
 * @returns Updated team
 */
export async function updateTeam(
  client: GraphQLClient,
  input: TeamInput,
  teamId: string,
): Promise<Pick<Team, 'id' | 'name'>> {
  const { updateTeam } = await makeGraphQLRequest<{
    /** Update team mutation */
    updateTeam: {
      /** Updated team */
      team: Team;
    };
  }>(client, UPDATE_TEAM, {
    input: {
      id: teamId,
      name: input.name,
      description: input.description,
      ssoTitle: input['sso-title'],
      ssoDepartment: input['sso-department'],
      ssoGroup: input['sso-group'],
      scopes: input.scopes,
      userEmails: input.users,
    },
  });
  return updateTeam.team;
}

/**
 * Sync the teams
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncTeams(
  client: GraphQLClient,
  inputs: TeamInput[],
): Promise<boolean> {
  // Fetch existing
  logger.info(colors.magenta(`Syncing "${inputs.length}" teams...`));

  let encounteredError = false;

  // Fetch existing
  const existingTeams = await fetchAllTeams(client);

  // Look up by name
  const teamsByName: { [k in string]: Pick<Team, 'id' | 'name'> } = keyBy(
    existingTeams,
    'name',
  );

  // Create new teams
  const newTeams = inputs.filter((input) => !teamsByName[input.name]);
  const updatedTeams = inputs.filter((input) => !!teamsByName[input.name]);

  // Create new teams
  await mapSeries(newTeams, async (team) => {
    try {
      const newTeam = await createTeam(client, team);
      teamsByName[newTeam.name] = newTeam;
      logger.info(colors.green(`Successfully created team "${team.name}"!`));
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(`Failed to sync team "${team.name}"! - ${err.message}`),
      );
    }
  });

  // Update all teams
  await mapSeries(updatedTeams, async (input) => {
    try {
      const newTeam = await updateTeam(
        client,
        input,
        teamsByName[input.name].id,
      );
      teamsByName[newTeam.name] = newTeam;
      logger.info(colors.green(`Successfully updated team "${input.name}"!`));
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(`Failed to sync team "${input.name}"! - ${err.message}`),
      );
    }
  });

  return !encounteredError;
}
