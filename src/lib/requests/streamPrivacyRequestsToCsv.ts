import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { map } from '../bluebird';
import colors from 'colors';
import { uniq } from 'lodash-es';

import { DEFAULT_TRANSCEND_API } from '../../constants';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllRequestIdentifiers,
  fetchAllRequests,
} from '../graphql';
import { logger } from '../../logger';
import {
  initCsvFile,
  appendCsvRowsOrdered,
  parseFilePath,
} from '../helpers';
import { formatRequestForCsv } from './formatRequestForCsv';

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

  const { baseName, extension } = parseFilePath(file);

  const filePaths = chunks.map((_, i) =>
    chunks.length === 1 ? file : `${baseName}-${i}${extension}`,
  );

  const chunkCounts = await map(
    chunks,
    async (chunk, i) => {
      const chunkFile = filePaths[i];
      let headers: string[] | undefined;
      let rowCount = 0;

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
          const enriched = skipRequestIdentifiers
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

          const rows = enriched.map(formatRequestForCsv);

          if (!headers) {
            headers = uniq(rows.map((r) => Object.keys(r)).flat());
            initCsvFile(chunkFile, headers);
          }

          appendCsvRowsOrdered(chunkFile, rows, headers);
          rowCount += rows.length;
        },
      });

      if (!headers) {
        initCsvFile(chunkFile, []);
      }

      return rowCount;
    },
    { concurrency: useChunks ? concurrency : 1 },
  );

  const totalCount = chunkCounts.reduce((a, b) => a + b, 0);

  logger.info(
    colors.magenta(
      `Streamed ${totalCount} requests to ${filePaths.length} file(s)`,
    ),
  );

  return { filePaths, totalCount };
}
