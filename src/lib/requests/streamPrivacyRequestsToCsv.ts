import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { map } from '../bluebird';
import colors from 'colors';
import cliProgress from 'cli-progress';
import { uniq } from 'lodash-es';

import { DEFAULT_TRANSCEND_API } from '../../constants';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllRequestIdentifiers,
  fetchAllRequests,
  fetchRequestsTotalCount,
} from '../graphql';
import { logger } from '../../logger';
import {
  initCsvFile,
  appendCsvRowsOrdered,
  parseFilePath,
} from '../helpers';
import {
  formatRequestForCsv,
  ExportedPrivacyRequest,
} from './formatRequestForCsv';

/**
 * Split a date range into N evenly-spaced chunks.
 *
 * @param after - Start of the date range
 * @param before - End of the date range
 * @param chunks - Number of chunks to split into
 * @returns Array of date range bounds
 */
function splitDateRange(
  after: Date,
  before: Date,
  chunks: number,
): { /** Chunk start */ createdAtAfter: Date; /** Chunk end */ createdAtBefore: Date }[] {
  const /** Range start ms */ start = after.getTime();
  const /** Range end ms */ end = before.getTime();
  const /** Ms per chunk */ chunkSize = (end - start) / chunks;
  return Array.from({ length: chunks }, (_, i) => ({
    createdAtAfter: new Date(start + chunkSize * i),
    createdAtBefore: new Date(
      i === chunks - 1 ? end : start + chunkSize * (i + 1),
    ),
  }));
}

/**
 * Stream privacy requests directly to CSV files, one file per date-range chunk.
 * Memory stays bounded to a single page of results at a time.
 * Supports both with and without request identifier enrichment.
 *
 * @param options - Options
 * @returns The list of written file paths and total row count
 */
export async function streamPrivacyRequestsToCsv({
  auth,
  sombraAuth,
  actions = [],
  statuses = [],
  identifierSearch,
  concurrency = 1,
  pageLimit = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
  createdAtBefore,
  createdAtAfter,
  updatedAtBefore,
  updatedAtAfter,
  isTest,
  skipRequestIdentifiers = false,
  file,
}: {
  /** Transcend API key authentication */
  auth: string;
  /** Search for a specific identifier */
  identifierSearch?: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Statuses to filter on */
  statuses?: RequestStatus[];
  /** The request action to fetch */
  actions?: RequestAction[];
  /** Number of parallel date-range chunks */
  concurrency?: number;
  /** Concurrency for fetching identifiers per page */
  pageLimit?: number;
  /** Filter for requests created before this date */
  createdAtBefore?: Date;
  /** Filter for requests created after this date */
  createdAtAfter?: Date;
  /** Filter for requests updated before this date */
  updatedAtBefore?: Date;
  /** Filter for requests updated after this date */
  updatedAtAfter?: Date;
  /** Return test requests */
  isTest?: boolean;
  /** Skip fetching request identifiers */
  skipRequestIdentifiers?: boolean;
  /** Output CSV file path */
  file: string;
}): Promise<{
  /** Paths to written CSV files */
  filePaths: string[];
  /** Total rows written */
  totalCount: number;
}> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const sombra = skipRequestIdentifiers
    ? undefined
    : await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Log date range
  let dateRange = '';
  if (createdAtBefore) {
    dateRange += ` before ${createdAtBefore.toISOString()}`;
  }
  if (createdAtAfter) {
    dateRange += `${
      dateRange ? ', and' : ''
    } after ${createdAtAfter.toISOString()}`;
  }
  logger.info(
    colors.magenta(
      `${
        actions.length > 0
          ? `Pulling requests of type "${actions.join('" , "')}"`
          : 'Pulling all requests'
      }${dateRange}`,
    ),
  );

  // Split into parallel date-range chunks when possible
  const useChunks = concurrency > 1 && createdAtAfter && createdAtBefore;
  const chunks = useChunks
    ? splitDateRange(createdAtAfter, createdAtBefore, concurrency)
    : [{ createdAtAfter, createdAtBefore }];

  if (useChunks) {
    logger.info(
      colors.magenta(
        `Splitting date range into ${concurrency} parallel chunks`,
      ),
    );
  }

  // Fetch total count once for the shared progress bar
  const filterBy = {
    type: actions.length > 0 ? actions : undefined,
    status: statuses.length > 0 ? statuses : undefined,
    isTest,
    createdAtBefore: createdAtBefore
      ? createdAtBefore.toISOString()
      : undefined,
    createdAtAfter: createdAtAfter
      ? createdAtAfter.toISOString()
      : undefined,
    updatedAtBefore: updatedAtBefore
      ? updatedAtBefore.toISOString()
      : undefined,
    updatedAtAfter: updatedAtAfter
      ? updatedAtAfter.toISOString()
      : undefined,
  };

  const t0 = Date.now();
  const totalExpected = await fetchRequestsTotalCount(client, filterBy);
  logger.info(
    colors.magenta(`Fetching ${totalExpected} requests`),
  );

  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );
  progressBar.start(totalExpected, 0);

  let globalFetched = 0;

  const { baseName, extension } = parseFilePath(file);

  const filePaths = chunks.map((_, i) =>
    chunks.length === 1 ? file : `${baseName}-${i}${extension}`,
  );

  interface FailedChunk {
    /** Chunk index */
    index: number;
    /** Start of failed date range */
    createdAtAfter?: Date;
    /** End of failed date range */
    createdAtBefore?: Date;
    /** Error message */
    error: string;
  }

  const failedChunks: FailedChunk[] = [];

  const chunkCounts = await map(
    chunks,
    async (chunk, i) => {
      const chunkFile = filePaths[i];
      let headers: string[] | undefined;
      let rowCount = 0;

      try {
        await fetchAllRequests(client, {
          actions,
          text: identifierSearch,
          statuses,
          createdAtBefore: chunk.createdAtBefore,
          createdAtAfter: chunk.createdAtAfter,
          updatedAtBefore,
          updatedAtAfter,
          isTest,
          onPage: async (nodes) => {
            if (nodes.length === 0) return;

            // Optionally enrich each request with its identifiers
            const enriched: ExportedPrivacyRequest[] = skipRequestIdentifiers
              ? nodes.map((n) => ({ ...n, requestIdentifiers: [] }))
              : await map(
                  nodes,
                  async (n) => ({
                    ...n,
                    requestIdentifiers: await fetchAllRequestIdentifiers(
                      client,
                      sombra!,
                      { requestId: n.id },
                    ),
                  }),
                  { concurrency: pageLimit },
                );

            const rows: Record<string, string | null | number | boolean>[] =
              enriched.map(formatRequestForCsv);

            if (!headers) {
              headers = uniq(
                rows.map((r: Record<string, unknown>) => Object.keys(r)).flat(),
              );
              initCsvFile(chunkFile, headers);
            }

            appendCsvRowsOrdered(chunkFile, rows, headers);
            rowCount += rows.length;
            globalFetched += rows.length;
            progressBar.update(globalFetched);
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(
          colors.red(
            `Chunk ${i} failed (${
              chunk.createdAtAfter?.toISOString() ?? 'start'
            } → ${
              chunk.createdAtBefore?.toISOString() ?? 'end'
            }): ${message}`,
          ),
        );
        failedChunks.push({
          index: i,
          createdAtAfter: chunk.createdAtAfter,
          createdAtBefore: chunk.createdAtBefore,
          error: message,
        });
      }

      if (!headers) {
        initCsvFile(chunkFile, []);
      }

      return rowCount;
    },
    { concurrency: useChunks ? concurrency : 1 },
  );

  progressBar.stop();
  const totalCount = chunkCounts.reduce((a, b) => a + b, 0);
  const elapsed = (Date.now() - t0) / 1000;

  if (failedChunks.length > 0) {
    logger.error(
      colors.red(
        `\n${failedChunks.length} chunk(s) failed. ` +
          'Re-run with these date ranges to fill the gaps:',
      ),
    );
    for (const fc of failedChunks) {
      logger.error(
        colors.red(
          `  Chunk ${fc.index}: --createdAtAfter=${
            fc.createdAtAfter?.toISOString() ?? ''
          } --createdAtBefore=${fc.createdAtBefore?.toISOString() ?? ''}`,
        ),
      );
    }
  }

  logger.info(
    colors.green(
      `Streamed ${totalCount} requests to ${filePaths.length} file(s) in ${elapsed}s`,
    ),
  );

  return { filePaths, totalCount };
}
