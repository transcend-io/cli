import colors from 'colors';
import { chunk, keyBy } from 'lodash-es';
import { RepositoryInput } from '../../codecs';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_REPOSITORIES, CREATE_REPOSITORY } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { mapSeries, map } from '../bluebird';
import { fetchAllRepositories, Repository } from './fetchAllRepositories';
import { logger } from '../../logger';

const CHUNK_SIZE = 100;

/**
 * Create a new repository
 *
 * @param client - GraphQL client
 * @param input - Repository input
 * @returns Created repository
 */
export async function createRepository(
  client: GraphQLClient,
  input: {
    /** Title of repository */
    name: string;
    /** Description of the repository */
    description?: string;
    /** Github repository */
    url: string;
    /** User IDs of owners */
    ownerIds?: string[];
    /** Emails of owners */
    ownerEmails?: string[];
    /** Team IDs */
    teamIds?: string[];
    /** Team names */
    teamNames?: string[];
  },
): Promise<Repository> {
  const {
    createRepository: { repository },
  } = await makeGraphQLRequest<{
    /** createRepository mutation */
    createRepository: {
      /** Software development kit */
      repository: Repository;
    };
  }>(client, CREATE_REPOSITORY, {
    input,
  });
  logger.info(colors.green(`Successfully created repository "${input.name}"!`));
  return repository;
}

/**
 * Update an existing repository
 *
 * @param client - GraphQL client
 * @param inputs - Repository input
 * @returns Updated repositories
 */
export async function updateRepositories(
  client: GraphQLClient,
  inputs: {
    /** ID of repository */
    id: string;
    /** Title of repository */
    name?: string;
    /** Description of the repository */
    description?: string;
    /** Github repository */
    url?: string;
    /** User IDs of owners */
    ownerIds?: string[];
    /** Emails of owners */
    ownerEmails?: string[];
    /** Team IDs */
    teamIds?: string[];
    /** Team names */
    teamNames?: string[];
  }[],
): Promise<Repository[]> {
  const {
    updateRepositories: { repositories },
  } = await makeGraphQLRequest<{
    /** updateRepositories mutation */
    updateRepositories: {
      /** Software development kit */
      repositories: Repository[];
    };
  }>(client, UPDATE_REPOSITORIES, {
    input: {
      repositories: inputs,
    },
  });
  logger.info(
    colors.green(`Successfully updated ${inputs.length} repositories!`),
  );
  return repositories;
}

/**
 * Sync the repositories
 *
 * @param client - GraphQL client
 * @param repositories - Repositories
 * @param concurrency - Concurrency
 * @returns The repositories that were upserted and whether the sync was successful
 */
export async function syncRepositories(
  client: GraphQLClient,
  repositories: RepositoryInput[],
  concurrency = 20,
): Promise<{
  /** The repositories that were upserted */
  repositories: Repository[];
  /** If successful */
  success: boolean;
}> {
  let encounteredError = false;
  const repos: Repository[] = [];

  // Index existing repositories
  const existing = await fetchAllRepositories(client);
  const repositoryByName = keyBy(existing, 'name');

  // Determine which repositories are new vs existing
  const mapRepositoriesToExisting = repositories.map((repoInput) => [
    repoInput,
    repositoryByName[repoInput.name]?.id,
  ]);

  // Create the new repositories
  const newRepositories = mapRepositoriesToExisting
    .filter(([, existing]) => !existing)
    .map(([repoInput]) => repoInput as RepositoryInput);
  try {
    logger.info(
      colors.magenta(
        `Creating "${newRepositories.length}" new repositories...`,
      ),
    );
    await map(
      newRepositories,
      async (repo) => {
        const newRepo = await createRepository(client, repo);
        repos.push(newRepo);
      },
      {
        concurrency,
      },
    );
    logger.info(
      colors.green(
        `Successfully synced ${newRepositories.length} repositories!`,
      ),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create repositories! - ${err.message}`));
  }

  // Update existing repositories
  const existingRepositories = mapRepositoriesToExisting.filter(
    (x): x is [RepositoryInput, string] => !!x[1],
  );
  const chunks = chunk(existingRepositories, CHUNK_SIZE);
  logger.info(
    colors.magenta(`Updating "${existingRepositories.length}" repositories...`),
  );

  await mapSeries(chunks, async (chunk) => {
    try {
      const updatedRepos = await updateRepositories(
        client,
        chunk.map(([input, id]) => ({
          ...input,
          id,
        })),
      );
      repos.push(...updatedRepos);
      logger.info(
        colors.green(
          `Successfully updated "${existingRepositories.length}" repositories!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(`Failed to update repositories! - ${err.message}`),
      );
    }

    logger.info(colors.green(`Synced "${repositories.length}" repositories!`));
  });

  // Return true upon success
  return {
    repositories: repos,
    success: !encounteredError,
  };
}
