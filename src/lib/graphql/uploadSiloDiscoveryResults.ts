import { chunk } from 'lodash-es';
import { mapSeries } from 'bluebird';
import { ADD_SILO_DISCOVERY_RESULTS } from './gqls';
import { GraphQLClient } from 'graphql-request';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { SiloDiscoveryRawResults } from '../code-scanning/findFilesToScan';

const CHUNK_SIZE = 1000;

/**
 * Uploads silo discovery results for Transcend to classify
 *
 * @param client - GraphQL Client
 * @param pluginId - pluginID to associate with the results
 * @param results - The results
 */
export async function uploadSiloDiscoveryResults(
  client: GraphQLClient,
  pluginId: string,
  results: SiloDiscoveryRawResults[],
): Promise<void> {
  const chunks = chunk(results, CHUNK_SIZE);

  await mapSeries(chunks, async (rawResults) => {
    await makeGraphQLRequest<{
      /** Whether we successfully uploaded the results */
      success: boolean;
    }>(client, ADD_SILO_DISCOVERY_RESULTS, {
      pluginId,
      rawResults,
    });
  });
}
