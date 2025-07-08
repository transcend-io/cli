import chunk from 'lodash/chunk';
import uniq from 'lodash/uniq';
import keyBy from 'lodash/keyBy';
import uniqBy from 'lodash/uniqBy';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { CodePackage, fetchAllCodePackages } from './fetchAllCodePackages';
import { logger } from '../../logger';
import { syncSoftwareDevelopmentKits } from './syncSoftwareDevelopmentKits';
import { map, mapSeries } from 'bluebird';
import { CodePackageInput, RepositoryInput } from '../../codecs';
import { CodePackageType } from '@transcend-io/privacy-types';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { CREATE_CODE_PACKAGE, UPDATE_CODE_PACKAGES } from './gqls';
import { syncRepositories } from './syncRepositories';

const CHUNK_SIZE = 100;

const LOOKUP_SPLIT_KEY = '%%%%';

/**
 * Create a new code package
 *
 * @param client - GraphQL client
 * @param input - Code package input
 * @returns Code package ID
 */
export async function createCodePackage(
  client: GraphQLClient,
  input: {
    /** Name of package */
    name: string;
    /** Description of package */
    description?: string;
    /** Type of package */
    type: CodePackageType;
    /** Relative path to package */
    relativePath: string;
    /** Repository ID */
    repositoryId?: string;
    /** Name of repository */
    repositoryName?: string;
    /** IDs of SDKs */
    softwareDevelopmentKitIds?: string[];
    /** IDs of owners */
    ownerIds?: string[];
    /** Emails of owners */
    ownerEmails?: string[];
    /** IDs of teams */
    teamIds?: string[];
    /** Names of teams */
    teamNames?: string[];
  },
): Promise<CodePackage> {
  const {
    createCodePackage: { codePackage },
  } = await makeGraphQLRequest<{
    /** createCodePackage mutation */
    createCodePackage: {
      /** Code package */
      codePackage: CodePackage;
    };
  }>(client, CREATE_CODE_PACKAGE, {
    input,
  });
  logger.info(
    colors.green(`Successfully created code package "${input.name}"!`),
  );
  return codePackage;
}

/**
 * Update an existing code package
 *
 * @param client - GraphQL client
 * @param inputs - Code package input
 */
export async function updateCodePackages(
  client: GraphQLClient,
  inputs: {
    /** ID of code package */
    id: string;
    /** Name of package */
    name: string;
    /** Description of package */
    description?: string;
    /** Type of package */
    type: CodePackageType;
    /** Relative path to package */
    relativePath: string;
    /** Repository ID */
    repositoryId?: string;
    /** Name of repository */
    repositoryName?: string;
    /** IDs of SDKs */
    softwareDevelopmentKitIds?: string[];
    /** IDs of owners */
    ownerIds?: string[];
    /** Emails of owners */
    ownerEmails?: string[];
    /** IDs of teams */
    teamIds?: string[];
    /** Names of teams */
    teamNames?: string[];
  }[],
): Promise<CodePackage[]> {
  const {
    updateCodePackages: { codePackages },
  } = await makeGraphQLRequest<{
    /** updateCodePackages mutation */
    updateCodePackages: {
      /** Code packages */
      codePackages: CodePackage[];
    };
  }>(client, UPDATE_CODE_PACKAGES, {
    input: {
      codePackages: inputs,
    },
  });
  logger.info(
    colors.green(`Successfully updated ${inputs.length} code packages!`),
  );
  return codePackages;
}

/**
 * Uploads silo discovery results for Transcend to classify
 *
 * @param client - GraphQL Client
 * @param codePackages - Packages to upload
 * @param concurrency - How many concurrent requests to make
 * @returns True if successful, false if any updates failed
 */
export async function syncCodePackages(
  client: GraphQLClient,
  codePackages: CodePackageInput[],
  concurrency = 20,
): Promise<boolean> {
  let encounteredError = false;
  const [
    existingCodePackages,
    { softwareDevelopmentKits: existingSoftwareDevelopmentKits },
  ] = await Promise.all([
    // fetch all code packages
    fetchAllCodePackages(client),
    // make sure all SDKs exist
    syncSoftwareDevelopmentKits(
      client,
      uniqBy(
        codePackages
          .map(({ type, softwareDevelopmentKits = [] }) =>
            softwareDevelopmentKits.map(({ name }) => ({
              name,
              codePackageType: type,
            })),
          )
          .flat(),
        ({ name, codePackageType }) =>
          `${name}${LOOKUP_SPLIT_KEY}${codePackageType}`,
      ),
      concurrency,
    ),
    // make sure all Repositories exist
    syncRepositories(
      client,
      uniqBy(codePackages, 'repositoryName').map(
        ({ repositoryName }) =>
          ({
            name: repositoryName,
            url: `https://github.com/${repositoryName}`,
          } as RepositoryInput),
      ),
    ),
  ]);

  const softwareDevelopmentKitLookup = keyBy(
    existingSoftwareDevelopmentKits,
    ({ name, codePackageType }) =>
      `${name}${LOOKUP_SPLIT_KEY}${codePackageType}`,
  );
  const codePackagesLookup = keyBy(
    existingCodePackages,
    ({ name, type }) => `${name}${LOOKUP_SPLIT_KEY}${type}`,
  );

  // Determine which codePackages are new vs existing
  const mapCodePackagesToExisting = codePackages.map((codePackageInput) => [
    codePackageInput,
    codePackagesLookup[
      `${codePackageInput.name}${LOOKUP_SPLIT_KEY}${codePackageInput.type}`
    ]?.id,
  ]);

  // Create the new codePackages
  const newCodePackages = mapCodePackagesToExisting
    .filter(([, existing]) => !existing)
    .map(([codePackageInput]) => codePackageInput as CodePackageInput);
  try {
    logger.info(
      colors.magenta(
        `Creating "${newCodePackages.length}" new code packages...`,
      ),
    );
    await map(
      newCodePackages,
      async ({ softwareDevelopmentKits, ...codePackage }) => {
        await createCodePackage(client, {
          ...codePackage,
          ...(softwareDevelopmentKits
            ? {
                softwareDevelopmentKitIds: uniq(
                  softwareDevelopmentKits.map(({ name }) => {
                    const sdk =
                      softwareDevelopmentKitLookup[
                        `${name}${LOOKUP_SPLIT_KEY}${codePackage.type}`
                      ];
                    if (!sdk) {
                      throw new Error(
                        `Failed to find SDK with name: "${name}"`,
                      );
                    }
                    return sdk.id;
                  }),
                ),
              }
            : {}),
        });
      },
      {
        concurrency,
      },
    );
    logger.info(
      colors.green(
        `Successfully synced ${newCodePackages.length} code packages!`,
      ),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create code packages! - ${err.message}`));
  }

  // Update existing codePackages
  const existingCodePackageInputs = mapCodePackagesToExisting.filter(
    (x): x is [CodePackageInput, string] => !!x[1],
  );
  logger.info(
    colors.magenta(
      `Updating "${existingCodePackageInputs.length}" code packages...`,
    ),
  );
  const chunks = chunk(existingCodePackageInputs, CHUNK_SIZE);

  await mapSeries(chunks, async (chunk) => {
    try {
      await updateCodePackages(
        client,
        chunk.map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ([{ softwareDevelopmentKits, repositoryName, ...input }, id]) => ({
            ...input,
            ...(softwareDevelopmentKits
              ? {
                  softwareDevelopmentKitIds: uniq(
                    softwareDevelopmentKits.map(({ name }) => {
                      const sdk =
                        softwareDevelopmentKitLookup[
                          `${name}${LOOKUP_SPLIT_KEY}${input.type}`
                        ];
                      if (!sdk) {
                        throw new Error(
                          `Failed to find SDK with name: "${name}"`,
                        );
                      }
                      return sdk.id;
                    }),
                  ),
                }
              : {}),
            id,
          }),
        ),
      );
      logger.info(
        colors.green(`Successfully updated "${chunk.length}" code packages!`),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(`Failed to update code packages! - ${err.message}`),
      );
    }
  });

  logger.info(colors.green(`Synced "${codePackages.length}" code packages!`));
  return !encounteredError;
}
