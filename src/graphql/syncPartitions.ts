import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import {
  UPDATE_CONSENT_MANAGER_PARTITION,
  CREATE_CONSENT_PARTITION,
  CONSENT_PARTITIONS,
} from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { mapSeries } from 'bluebird';
import difference from 'lodash/difference';
import { logger } from '../logger';
import { PartitionInput } from '../codecs';

const PAGE_SIZE = 50;

export interface TranscendPartition {
  /** Name of partition */
  name: string;
  /** Partition value */
  partition: string;
}

/**
 * Fetch the list of partitions
 *
 * @param client - GraphQL client
 * @returns Partition list
 */
export async function fetchPartitions(
  client: GraphQLClient,
): Promise<TranscendPartition[]> {
  const partitions: TranscendPartition[] = [];
  let offset = 0;

  // Fetch all partitions
  let shouldContinue = false;
  do {
    const {
      consentPartitions: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Consent experience */
      consentPartitions: {
        /** List */
        nodes: TranscendPartition[];
      };
    }>(client, CONSENT_PARTITIONS, {
      first: PAGE_SIZE,
      offset,
    });
    partitions.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return partitions.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sync the consent manager
 *
 * @param client - GraphQL client
 * @param partitionInputs  - The partition input
 *@returns true on success
 */
export async function syncPartitions(
  client: GraphQLClient,
  partitionInputs: PartitionInput[],
): Promise<boolean> {
  let encounteredError = false;
  const partitions = await fetchPartitions(client);
  const newPartitionNames = difference(
    partitionInputs.map(({ name }) => name),
    partitions.map(({ name }) => name),
  );
  await mapSeries(newPartitionNames, async (name) => {
    try {
      await makeGraphQLRequest(client, CREATE_CONSENT_PARTITION, {
        input: {
          name,
        },
      });
      logger.info(
        colors.green(`Successfully created consent partition: ${name}!`),
      );
    } catch (err) {
      logger.error(
        colors.red(
          `Failed to create consent partition: ${name}! - ${err.message}`,
        ),
      );
      encounteredError = true;
    }
  });

  // sync partition
  if (consentManager.partition) {
    try {
      await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_PARTITION, {
        partition: consentManager.partition,
        airgapBundleId,
      });
      logger.info(colors.green('Successfully updated consent partition!'));
    } catch (err) {
      logger.error(
        colors.red(`Failed to sync consent manager partition: ${err.message}`),
      );
      encounteredError = true;
    }
  }
  return !encounteredError;
}
