import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { CREATE_CONSENT_PARTITION, CONSENT_PARTITIONS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { mapSeries } from '../bluebird-replace';
import { difference } from 'lodash-es';
import { logger } from '../../logger';
import { PartitionInput } from '../../codecs';
import { fetchConsentManagerId } from './fetchConsentManagerId';

const PAGE_SIZE = 50;

export interface TranscendPartition {
  /** ID of the partition */
  id: string;
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
  // Grab the bundleId associated with this API key
  const airgapBundleId = await fetchConsentManagerId(client);
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
          id: airgapBundleId,
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
  return !encounteredError;
}
