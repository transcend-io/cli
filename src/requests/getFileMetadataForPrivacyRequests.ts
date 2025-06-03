import { map } from 'bluebird';
import colors from 'colors';
import cliProgress from 'cli-progress';

import { PrivacyRequest } from '../graphql';
import * as t from 'io-ts';
import { Got } from 'got/dist/source';
import { decodeCodec, valuesOf } from '@transcend-io/type-utils';
import { logger } from '../logger';
import { TableEncryptionType } from '@transcend-io/privacy-types';

export const IntlMessage = t.type({
  /** The message key */
  defaultMessage: t.string,
  /** ID */
  id: t.string,
});

/** Type */
export type IntlMessage = t.TypeOf<typeof IntlMessage>;

export const RequestFileMetadata = t.type({
  /** The key to pass to download the file contents */
  downloadKey: t.string,
  /** Error message related to file */
  error: t.union([t.null, t.string]),
  /** Mimetype of file */
  mimetype: t.string,
  /** Size of file, stored as string as this can be a BigInt */
  size: t.string,
  /** Name of file based on datapoint names in Transcend */
  fileName: t.string,
  /** The metadata on the datapoint */
  dataPoint: t.type({
    /** ID of datapoint */
    id: t.string,
    /** The title of datapoint */
    title: t.union([IntlMessage, t.null]),
    /** Description of datapoint */
    description: t.union([IntlMessage, t.null]),
    /** Name of datapoint */
    name: t.string,
    /** Slug of datapoint */
    slug: t.string,
    /** Table level encryption information */
    encryption: t.union([valuesOf(TableEncryptionType), t.null]),
    /** The name of the data silo */
    dataSilo: t.type({
      /** ID of the data silo */
      id: t.string,
      /** The title of the data silo */
      title: t.string,
      /** The description of the data silo */
      description: t.string,
      /** The type of the data silo */
      type: t.string,
      /** The outer type of the data silo */
      outerType: t.union([t.string, t.null]),
    }),
    /** The path to the datapoint if a database (e.g. name of schema) */
    path: t.array(t.string),
  }),
});

/** Type override */
export type RequestFileMetadata = t.TypeOf<typeof RequestFileMetadata>;

export const RequestFileMetadataResponse = t.type({
  /** The list of file metadata */
  nodes: t.array(RequestFileMetadata),
  /** The total number of file metadata */
  totalCount: t.number,
  /** Links to next pages */
  _links: t.partial({
    /** The link to the next page of file metadata */
    next: t.union([t.string, t.null]),
    /** The link to the previous page of file metadata */
    previous: t.union([t.string, t.null]),
  }),
});

/** Type override */
export type RequestFileMetadataResponse = t.TypeOf<
  typeof RequestFileMetadataResponse
>;

/**
 * Given a list of privacy requests, download the file metadata
 * for these requests - this is useful to prepare the files in a
 * data access request for download.
 *
 * @param requests - The list of privacy requests to download files for
 * @param options - Options
 * @returns The number of requests canceled
 */
export async function getFileMetadataForPrivacyRequests(
  requests: Pick<PrivacyRequest, 'id' | 'status'>[],
  {
    sombra,
    concurrency = 5,
    limit = 100,
  }: {
    /** Sombra instance */
    sombra: Got;
    /** Number of files to pull at once */
    limit?: number;
    /** Concurrency limit for approving */
    concurrency?: number;
  },
): Promise<[Pick<PrivacyRequest, 'id' | 'status'>, RequestFileMetadata[]][]> {
  logger.info(
    colors.magenta(`Pulling file metadata for ${requests.length} requests`),
  );

  // Time duration
  const t0 = new Date().getTime();
  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // Start timer
  let total = 0;
  progressBar.start(requests.length, 0);

  // Loop over the requests
  const results = await map(
    requests,
    async (
      requestToDownload,
    ): Promise<
      [Pick<PrivacyRequest, 'id' | 'status'>, RequestFileMetadata[]]
    > => {
      const localResults: RequestFileMetadata[] = [];

      // Paginate over the file metadata for this request
      let shouldContinue = true;
      let offset = 0;
      while (shouldContinue) {
        let response: RequestFileMetadataResponse;
        try {
          // Grab the file metadata for this request
          // eslint-disable-next-line no-await-in-loop
          const rawResponse = await sombra
            .get(
              `v1/data-subject-request/${requestToDownload.id}/download-keys`,
              {
                searchParams: {
                  limit,
                  offset,
                },
              },
            )
            .json();
          response = decodeCodec(RequestFileMetadataResponse, rawResponse);
          localResults.push(...response.nodes);

          // Increase offset and break if no more pages
          offset += limit;
          shouldContinue =
            // eslint-disable-next-line no-underscore-dangle
            !!response._links.next && response.nodes.length === limit;
        } catch (err) {
          throw new Error(
            `Received an error from server: ${
              err?.response?.body || err?.message
            }`,
          );
        }
      }

      total += 1;
      progressBar.update(total);
      return [requestToDownload, localResults];
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully downloaded file metadata ${requests.length} requests in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );

  return results;
}
