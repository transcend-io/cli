import colors from 'colors';
import { chunk, keyBy } from 'lodash-es';
import { SoftwareDevelopmentKitInput } from '../../codecs';
import { GraphQLClient } from 'graphql-request';
import {
  UPDATE_SOFTWARE_DEVELOPMENT_KITS,
  CREATE_SOFTWARE_DEVELOPMENT_KIT,
} from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import Bluebird from 'bluebird';
const { mapSeries, map } = Bluebird;
import {
  fetchAllSoftwareDevelopmentKits,
  SoftwareDevelopmentKit,
} from './fetchAllSoftwareDevelopmentKits';
import { logger } from '../../logger';
import { CodePackageType } from '@transcend-io/privacy-types';

const CHUNK_SIZE = 100;

/**
 * Create a new software development kit
 *
 * @param client - GraphQL client
 * @param input - Software development kit input
 * @returns Created software development kit
 */
export async function createSoftwareDevelopmentKit(
  client: GraphQLClient,
  input: {
    /** Title of software development kit */
    name: string;
    /** Code package type */
    codePackageType: CodePackageType;
    /** Description of the SDK */
    description?: string;
    /** Github repository */
    repositoryUrl?: string;
    /** Integration name */
    catalogIntegrationName?: string;
    /** Doc links */
    documentationLinks?: string[];
    /** Code package IDs */
    codePackageIds?: string[];
    /** Code package names */
    codePackageNames?: string[];
    /** User IDs of owners */
    ownerIds?: string[];
    /** Emails of owners */
    ownerEmails?: string[];
    /** Team IDs */
    teamIds?: string[];
    /** Team names */
    teamNames?: string[];
  },
): Promise<SoftwareDevelopmentKit> {
  const {
    createSoftwareDevelopmentKit: { softwareDevelopmentKit },
  } = await makeGraphQLRequest<{
    /** createSoftwareDevelopmentKit mutation */
    createSoftwareDevelopmentKit: {
      /** Software development kit */
      softwareDevelopmentKit: SoftwareDevelopmentKit;
    };
  }>(client, CREATE_SOFTWARE_DEVELOPMENT_KIT, {
    input,
  });
  logger.info(
    colors.green(
      `Successfully created software development kit "${input.name}"!`,
    ),
  );
  return softwareDevelopmentKit;
}

/**
 * Update an existing software development kit
 *
 * @param client - GraphQL client
 * @param inputs - Software development kit input
 * @returns Updated software development kits
 */
export async function updateSoftwareDevelopmentKits(
  client: GraphQLClient,
  inputs: {
    /** ID of software development kit */
    id: string;
    /** Title of software development kit */
    name?: string;
    /** Description of the SDK */
    description?: string;
    /** Github repository */
    repositoryUrl?: string;
    /** Integration name */
    catalogIntegrationName?: string;
    /** Doc links */
    documentationLinks?: string[];
    /** Code package IDs */
    codePackageIds?: string[];
    /** Code package names */
    codePackageNames?: string[];
    /** User IDs of owners */
    ownerIds?: string[];
    /** Emails of owners */
    ownerEmails?: string[];
    /** Team IDs */
    teamIds?: string[];
    /** Team names */
    teamNames?: string[];
  }[],
): Promise<SoftwareDevelopmentKit[]> {
  const {
    updateSoftwareDevelopmentKits: { softwareDevelopmentKits },
  } = await makeGraphQLRequest<{
    /** updateSoftwareDevelopmentKits mutation */
    updateSoftwareDevelopmentKits: {
      /** Software development kit */
      softwareDevelopmentKits: SoftwareDevelopmentKit[];
    };
  }>(client, UPDATE_SOFTWARE_DEVELOPMENT_KITS, {
    input: {
      softwareDevelopmentKits: inputs,
    },
  });
  logger.info(
    colors.green(
      `Successfully updated ${inputs.length} software development kits!`,
    ),
  );
  return softwareDevelopmentKits;
}

/**
 * Sync the software development kits
 *
 * @param client - GraphQL client
 * @param softwareDevelopmentKits - Software development kits
 * @param concurrency - Concurrency
 * @returns The software development kits that were upserted and whether the sync was successful
 */
export async function syncSoftwareDevelopmentKits(
  client: GraphQLClient,
  softwareDevelopmentKits: SoftwareDevelopmentKitInput[],
  concurrency = 20,
): Promise<{
  /** The SDKs that were upserted */
  softwareDevelopmentKits: SoftwareDevelopmentKit[];
  /** If successful */
  success: boolean;
}> {
  let encounteredError = false;
  const sdks: SoftwareDevelopmentKit[] = [];
  logger.info(colors.magenta('Syncing software development kits...'));

  // Index existing software development kits
  const existing = await fetchAllSoftwareDevelopmentKits(client);
  const softwareDevelopmentKitByTitle = keyBy(
    existing,
    ({ name, codePackageType }) => JSON.stringify({ name, codePackageType }),
  );

  // Determine which software development kits are new vs existing
  const mapSoftwareDevelopmentKitsToExisting = softwareDevelopmentKits.map(
    (sdkInput) => [
      sdkInput,
      softwareDevelopmentKitByTitle[
        JSON.stringify({
          name: sdkInput.name,
          codePackageType: sdkInput.codePackageType,
        })
      ]?.id,
    ],
  );

  // Create the new software development kits
  const newSoftwareDevelopmentKits = mapSoftwareDevelopmentKitsToExisting
    .filter(([, existing]) => !existing)
    .map(([sdkInput]) => sdkInput as SoftwareDevelopmentKitInput);
  try {
    logger.info(
      colors.magenta(
        `Creating "${newSoftwareDevelopmentKits.length}" new software development kits...`,
      ),
    );
    await map(
      newSoftwareDevelopmentKits,
      async (sdk) => {
        const newSdk = await createSoftwareDevelopmentKit(client, sdk);
        sdks.push(newSdk);
      },
      {
        concurrency,
      },
    );
    logger.info(
      colors.green(
        `Successfully synced ${newSoftwareDevelopmentKits.length} software development kits!`,
      ),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(
        `Failed to create software development kits! - ${err.message}`,
      ),
    );
  }

  // Update existing software development kits
  const existingSoftwareDevelopmentKits =
    mapSoftwareDevelopmentKitsToExisting.filter(
      (x): x is [SoftwareDevelopmentKitInput, string] => !!x[1],
    );
  const chunks = chunk(existingSoftwareDevelopmentKits, CHUNK_SIZE);
  logger.info(
    colors.magenta(
      `Updating "${existingSoftwareDevelopmentKits.length}" software development kits...`,
    ),
  );

  await mapSeries(chunks, async (chunk) => {
    try {
      const updatedSdks = await updateSoftwareDevelopmentKits(
        client,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        chunk.map(([{ codePackageType, ...input }, id]) => ({
          ...input,
          id,
        })),
      );
      sdks.push(...updatedSdks);
      logger.info(
        colors.green(
          `Successfully updated "${existingSoftwareDevelopmentKits.length}" software development kits!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to update software development kits! - ${err.message}`,
        ),
      );
    }

    logger.info(
      colors.green(
        `Synced "${softwareDevelopmentKits.length}" software development kits!`,
      ),
    );
  });

  // Return true upon success
  return {
    softwareDevelopmentKits: sdks,
    success: !encounteredError,
  };
}
