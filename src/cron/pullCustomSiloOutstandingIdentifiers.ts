import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchRequestDataSiloActiveCount,
} from '../graphql';
import colors from 'colors';
import cliProgress from 'cli-progress';
import {
  pullCronPageOfIdentifiers,
  CronIdentifier,
} from './pullCronPageOfIdentifiers';
import { RequestAction } from '@transcend-io/privacy-types';
import { logger } from '../logger';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { mapSeries } from 'bluebird';

export interface CronIdentifierWithAction extends CronIdentifier {
  /** The request action that the identifier relates to */
  action: RequestAction;
}

export interface ChunkCallback {
  /** The chunk of identifiers formatted for CSV */
  identifiersFormattedForCsv: {
    [k in string]: string | null | boolean | number;
  }[];
  /** The raw identifiers */
  identifiers: CronIdentifierWithAction[];
  /** Whether this is the last chunk */
  isLastChunk: boolean;
  /** The chunk number (1-based) */
  chunkNumber: number;
}

/**
 * Pull the set of identifiers outstanding for a cron or AVC integration
 *
 * @param options - Options
 */
export async function pullCustomSiloOutstandingIdentifiers({
  dataSiloId,
  auth,
  sombraAuth,
  actions,
  pageLimit = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
  skipRequestCount = false,
  chunkSize,
  onChunk,
}: {
  /** Transcend API key authentication */
  auth: string;
  /** Data Silo ID to pull down jobs for */
  dataSiloId: string;
  /** The request actions to fetch */
  actions: RequestAction[];
  /** Page limit when fetching identifiers */
  pageLimit?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Skip request count */
  skipRequestCount?: boolean;
  /** Size of chunks to process. If provided, onChunk callback will be called for each chunk */
  chunkSize?: number;
  /** Callback function called when a chunk of identifiers is ready */
  onChunk?: (chunk: ChunkCallback) => Promise<void>;
}): Promise<{
  /** Raw Identifiers */
  identifiers: CronIdentifierWithAction[];
  /** Identifiers formatted for CSV */
  identifiersFormattedForCsv: {
    [k in string]: string | null | boolean | number;
  }[];
}> {
  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Create GraphQL client to connect to Transcend backend
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  let totalRequestCount = 0;
  if (!skipRequestCount) {
    totalRequestCount = await fetchRequestDataSiloActiveCount(client, {
      dataSiloId,
    });
  }

  logger.info(
    colors.magenta(
      `Pulling ${skipRequestCount ? (chunkSize ?? 'all') : totalRequestCount
      } outstanding request identifiers ` +
      `for data silo: "${dataSiloId}" for requests of types "${actions.join(
        '", "',
      )}"`,
    ),
  );

  // Time duration
  const t0 = new Date().getTime();
  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );
  const foundRequestIds = new Set<string>();

  // identifiers found in total
  const identifiers: CronIdentifierWithAction[] = [];
  let chunkNumber = 1;
  let currentChunk: CronIdentifierWithAction[] = [];

  // Helper function to process a chunk
  const processChunk = async (isLastChunk = false): Promise<void> => {
    if (currentChunk.length === 0) return;

    // Format the chunk for CSV
    const chunkFormattedForCsv = currentChunk.map(({ attributes, ...identifier }) => ({
      ...identifier,
      ...attributes.reduce(
        (acc, val) =>
          Object.assign(acc, {
            [val.key]: val.values.join(','),
          }),
        {},
      ),
    }));

    if (onChunk) {
      await onChunk({
        identifiersFormattedForCsv: chunkFormattedForCsv,
        identifiers: [...currentChunk],
        isLastChunk,
        chunkNumber,
      });
    }

    // Add to total identifiers for backward compatibility
    identifiers.push(...currentChunk);
    currentChunk = [];
    chunkNumber += 1;
  };

  // map over each action
  if (!skipRequestCount) {
    progressBar.start(totalRequestCount, 0);
  }
  console.log('actions', actions);
  console.log('chunkSize', chunkSize);
  await mapSeries(actions, async (action) => {
    let offset = 0;
    let shouldContinue = true;

    // Fetch a page of identifiers
    while (shouldContinue) {
      // eslint-disable-next-line no-await-in-loop
      const pageIdentifiers = await pullCronPageOfIdentifiers(sombra, {
        dataSiloId,
        limit: pageLimit,
        offset,
        requestType: action,
      });
      console.log('pulled page of identifiers', pageIdentifiers.length);

      const pageIdentifiersWithAction = pageIdentifiers.map((identifier) => {
        foundRequestIds.add(identifier.requestId);
        return {
          ...identifier,
          action,
        };
      });

      // If chunking is enabled, add to current chunk and process if needed
      if (chunkSize) {
        console.log('pushing to current chunk', pageIdentifiersWithAction.length);
        currentChunk.push(...pageIdentifiersWithAction);

        // Process chunk if it reaches the size limit
        while (currentChunk.length >= chunkSize) {
          const chunkToProcess = currentChunk.splice(0, chunkSize);
          const chunkFormattedForCsv = chunkToProcess.map(({ attributes, ...identifier }) => ({
            ...identifier,
            ...attributes.reduce(
              (acc, val) =>
                Object.assign(acc, {
                  [val.key]: val.values.join(','),
                }),
              {},
            ),
          }));

          if (onChunk) {
            console.log('onChunk', chunkToProcess.length);
            // eslint-disable-next-line no-await-in-loop
            await onChunk({
              identifiersFormattedForCsv: chunkFormattedForCsv,
              identifiers: chunkToProcess,
              isLastChunk: false,
              chunkNumber,
            });
          }

          // Add to total identifiers for backward compatibility
          identifiers.push(...chunkToProcess);
          chunkNumber += 1;
        }
      } else {
        // Original behavior - add to total identifiers
        identifiers.push(...pageIdentifiersWithAction);
      }

      shouldContinue = pageIdentifiers.length === pageLimit;
      offset += pageLimit;
      if (!skipRequestCount) {
        progressBar.update(foundRequestIds.size);
      } else {
        logger.info(
          colors.magenta(
            `Pulled ${pageIdentifiers.length} outstanding identifiers for ${foundRequestIds.size} requests`,
          ),
        );
      }
    }
  });

  // Process any remaining identifiers in the current chunk
  if (chunkSize && currentChunk.length > 0) {
    await processChunk(true);
  }

  if (!skipRequestCount) {
    progressBar.stop();
  }
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully pulled ${identifiers.length} outstanding identifiers from ${foundRequestIds.size
      } requests in "${totalTime / 1000}" seconds!`,
    ),
  );

  // Write out to CSV (for backward compatibility when not using chunking)
  const data = identifiers.map(({ attributes, ...identifier }) => ({
    ...identifier,
    ...attributes.reduce(
      (acc, val) =>
        Object.assign(acc, {
          [val.key]: val.values.join(','),
        }),
      {},
    ),
  }));

  return { identifiers, identifiersFormattedForCsv: data };
}
