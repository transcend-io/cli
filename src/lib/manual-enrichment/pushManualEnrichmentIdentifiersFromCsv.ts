import colors from 'colors';
import { DEFAULT_TRANSCEND_API } from '../../constants';
import { logger } from '../../logger';
import { map } from '../bluebird-replace';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  makeGraphQLRequest,
  UPDATE_PRIVACY_REQUEST,
} from '../graphql';
import { readCsv } from '../requests';
import {
  enrichPrivacyRequest,
  EnrichPrivacyRequest,
} from './enrichPrivacyRequest';

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
    colors.magenta(
      `Enriching "${activeResults.length.toLocaleString()}" privacy requests.`,
    ),
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
      } catch {
        errorCount += 1;
      }
    },
    { concurrency },
  );

  logger.info(
    colors.green(
      `Successfully notified Transcend! \n Success count: ${successCount.toLocaleString()}.`,
    ),
  );

  if (skippedCount > 0) {
    logger.info(
      colors.magenta(`Skipped count: ${skippedCount.toLocaleString()}.`),
    );
  }

  if (errorCount > 0) {
    logger.info(colors.red(`Error Count: ${errorCount.toLocaleString()}.`));
    throw new Error(
      `Failed to enrich: ${errorCount.toLocaleString()} requests.`,
    );
  }

  return activeResults.length;
}
