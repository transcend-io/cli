import colors from 'colors';
import { map } from '../bluebird';
import { logger } from '../../logger';
import {
  UPDATE_PRIVACY_REQUEST,
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  makeGraphQLRequest,
} from '../graphql';
import {
  enrichPrivacyRequest,
  EnrichPrivacyRequest,
} from './enrichPrivacyRequest';
import { readCsv } from '../requests';
import { DEFAULT_TRANSCEND_API } from '../../constants';

/**
 * Push a CSV of enriched requests back into Transcend
 *
 * @param options - Options
 * @returns Number of items processed
 */
export async function pushManualEnrichmentIdentifiersFromCsv({
  file,
  auth,
  sombraAuth,
  enricherId,
  markSilent,
  concurrency = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** ID of enricher being uploaded to */
  enricherId: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Concurrency */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Mark requests in silent mode before enriching */
  markSilent?: boolean;
}): Promise<number> {
  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Read from CSV
  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const activeResults = readCsv(file, EnrichPrivacyRequest);

  // Notify Transcend
  logger.info(
    colors.magenta(`Enriching "${activeResults.length}" privacy requests.`),
  );

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  await map(
    activeResults,
    async (request, index) => {
      try {
        // Mark requests in silent mode before a certain date
        if (markSilent) {
          await makeGraphQLRequest(client, UPDATE_PRIVACY_REQUEST, {
            input: {
              id: request.id,
              isSilent: true,
            },
          });

          logger.info(
            colors.magenta(`Mark request as silent mode - ${request.id}`),
          );
        }

        const result = await enrichPrivacyRequest(
          sombra,
          request,
          enricherId,
          index,
        );
        if (result) {
          successCount += 1;
        } else {
          skippedCount += 1;
        }
      } catch (err) {
        errorCount += 1;
      }
    },
    { concurrency },
  );

  logger.info(
    colors.green(
      `Successfully notified Transcend! \n Success count: ${successCount}.`,
    ),
  );

  if (skippedCount > 0) {
    logger.info(colors.magenta(`Skipped count: ${skippedCount}.`));
  }

  if (errorCount > 0) {
    logger.info(colors.red(`Error Count: ${errorCount}.`));
    throw new Error(`Failed to enrich: ${errorCount} requests.`);
  }

  return activeResults.length;
}
