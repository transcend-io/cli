import { map } from 'bluebird';
import chunk from 'lodash/chunk';
import { buildTranscendGraphQLClient } from '../graphql';
import colors from 'colors';
import { logger } from '../logger';
import { readCsv } from '../requests';
import { pushDataFlows, DataFlowRow } from './pushDataFlows';

/**
 * Given a CSV of cron job outputs, mark all requests as completed in Transcend
 *
 * @param options - Options
 * @returns Number of items marked as completed
 */
export async function pushDataFlowsFromCsv({
  file,
  auth,
  concurrency = 100,
  transcendUrl = 'https://api.transcend.io',
}: {
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Upload concurrency */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Read from CSV
  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const activeResults = readCsv(file, DataFlowRow);

  // Notify Transcend
  logger.info(colors.magenta(`Uploading "${activeResults.length}" data flows`));
  await map(
    chunk(activeResults, 100),
    async (dataFlows) => {
      await pushDataFlows(client, dataFlows);
    },
    { concurrency },
  );

  logger.info(colors.green('Successfully pushed data flows Transcend!'));
  return activeResults.length;
}
