import { chunk } from 'lodash';
import { mapSeries } from 'bluebird';
import { ADD_SILO_DISCOVERY_RESULTS } from './gqls';
import { GraphQLClient } from 'graphql-request';
import { SiloDiscoveryRawResults } from 'src/plugins';

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

  await mapSeries(chunks, async (rawResults: SiloDiscoveryRawResults[]) => {
    await client.request<{
      /** Whether we successfully uploaded the results */
      success: boolean;
    }>(ADD_SILO_DISCOVERY_RESULTS, {
      pluginId,
      rawResults,
    });
  });
}
