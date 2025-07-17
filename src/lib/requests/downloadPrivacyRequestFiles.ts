import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import cliProgress from 'cli-progress';
import colors from 'colors';
import { DEFAULT_TRANSCEND_API } from '../../constants';
import { logger } from '../../logger';
import { map } from '../bluebird-replace';
import {
  APPROVE_PRIVACY_REQUEST,
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllRequests,
  makeGraphQLRequest,
} from '../graphql';
import { getFileMetadataForPrivacyRequests } from './getFileMetadataForPrivacyRequests';
import { streamPrivacyRequestFiles } from './streamPrivacyRequestFiles';

/**
 * Download a set of privacy requests to disk
 *
 * @param options - Options
 * @returns The number of requests canceled
 */
export async function downloadPrivacyRequestFiles({
  auth,
  folderPath,
  requestIds,
  createdAtBefore,
  sombraAuth,
  createdAtAfter,
  statuses = [RequestStatus.Approving, RequestStatus.Downloadable],
  concurrency = 5,
  transcendUrl = DEFAULT_TRANSCEND_API,
  approveAfterDownload = false,
}: {
  /** The folder path to download the files to */
  folderPath: string;
  /** Transcend API key authentication */
  auth: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Concurrency limit for approving */
  concurrency?: number;
  /** The request statuses to cancel */
  statuses?: RequestStatus[];
  /** The set of privacy requests to cancel */
  requestIds?: string[];
  /** Filter for requests created before this date */
  createdAtBefore?: Date;
  /** Filter for requests created after this date */
  createdAtAfter?: Date;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** When true, approve any requests in Transcend that are in status=APPROVING */
  approveAfterDownload?: boolean;
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Create the folder if it does not exist
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath);
  }

  // Pull in the requests
  const allRequests = await fetchAllRequests(client, {
    actions: [RequestAction.Access],
    createdAtBefore,
    createdAtAfter,
    statuses,
    requestIds,
  });

  // Download the file metadata for each request
  const requestFileMetadata = await getFileMetadataForPrivacyRequests(
    allRequests,
    {
      sombra,
      concurrency,
    },
  );

  // Start timer for download process
  const t0 = Date.now();
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );
  let total = 0;
  let totalApproved = 0;
  progressBar.start(allRequests.length, 0);

  // Download the files for each request
  await map(
    requestFileMetadata,
    async ([request, metadata]) => {
      // Create a new folder to store request files
      const requestFolder = path.join(folderPath, request.id);
      if (!existsSync(requestFolder)) {
        mkdirSync(requestFolder);
      }

      // Stream each file to disk
      await streamPrivacyRequestFiles(metadata, {
        sombra,
        requestId: request.id,
        onFileDownloaded: (fil, stream) => {
          // Ensure a folder exists for the file
          // filename looks like Health/heartbeat.csv
          const filePath = path.join(requestFolder, fil.fileName);
          const folder = path.dirname(filePath);
          if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
          }

          // Write to disk
          writeFileSync(filePath, stream);
        },
      });

      // Approve the request if requested
      if (approveAfterDownload && request.status === RequestStatus.Approving) {
        await makeGraphQLRequest(client, APPROVE_PRIVACY_REQUEST, {
          input: { requestId: request.id },
        });
        totalApproved += 1;
      }

      // Increment the progress bar
      total += 1;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = Date.now();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully downloaded ${total.toLocaleString()} requests in "${(
        totalTime / 1000
      ).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}" seconds!`,
    ),
  );
  if (totalApproved > 0) {
    logger.info(
      colors.green(
        `Approved ${totalApproved.toLocaleString()} requests in Transcend.`,
      ),
    );
  }
  return allRequests.length;
}
