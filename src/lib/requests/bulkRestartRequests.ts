import { PersistedState } from '@transcend-io/persisted-state';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { map } from 'bluebird';
import cliProgress from 'cli-progress';
import colors from 'colors';
import * as t from 'io-ts';
import difference from 'lodash/difference';
import { join } from 'path';
import { DEFAULT_TRANSCEND_API } from '../../constants';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllRequestIdentifiers,
  fetchAllRequests,
} from '../graphql';
import { logger } from '../../logger';
import { SuccessfulRequest } from './constants';
import { extractClientError } from './extractClientError';
import { restartPrivacyRequest } from './restartPrivacyRequest';

/** Minimal state we need to keep a list of requests */
const ErrorRequest = t.intersection([
  SuccessfulRequest,
  t.type({
    error: t.string,
  }),
]);

/** Type override */
type ErrorRequest = t.TypeOf<typeof ErrorRequest>;

/** Persist this data between runs of the script */
const CachedRequestState = t.type({
  restartedRequests: t.array(SuccessfulRequest),
  failingRequests: t.array(ErrorRequest),
});

/**
 * Upload a set of privacy requests from CSV
 *
 * @param options - Options
 */
export async function bulkRestartRequests({
  requestReceiptFolder,
  auth,
  sombraAuth,
  requestActions,
  requestStatuses,
  createdAtBefore,
  createdAtAfter,
  transcendUrl = DEFAULT_TRANSCEND_API,
  requestIds = [],
  createdAt = new Date(),
  silentModeBefore,
  sendEmailReceipt = false,
  emailIsVerified = true,
  copyIdentifiers = false,
  skipWaitingPeriod = false,
  concurrency = 20,
}: {
  /** Actions to filter for */
  requestActions: RequestAction[];
  /** Statues to filter for */
  requestStatuses: RequestStatus[];
  /** File where request receipts are stored */
  requestReceiptFolder: string;
  /** Transcend API key authentication */
  auth: string;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Request IDs to filter for */
  requestIds?: string[];
  /** Whether to re-verify the email when restarting the request */
  emailIsVerified?: boolean;
  /** Filter for requests that were submitted before this date */
  createdAt?: Date;
  /** Requests that have been open for this length of time should be marked as silent mode */
  silentModeBefore?: Date;
  /** Send an email receipt to the restarted requests */
  sendEmailReceipt?: boolean;
  /** Copy over all identifiers rather than restarting the request only with the core identifier */
  copyIdentifiers?: boolean;
  /** Skip the waiting period when restarting requests */
  skipWaitingPeriod?: boolean;
  /** Filter for requests created before this date */
  createdAtBefore?: Date;
  /** Filter for requests created after this date */
  createdAtAfter?: Date;
  /** Concurrency to upload requests at */
  concurrency?: number;
}): Promise<void> {
  // Time duration
  const t0 = new Date().getTime();
  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // Create a new state file to store the requests from this run
  const cacheFile = join(
    requestReceiptFolder,
    `tr-request-restart-${new Date().toISOString()}`,
  );
  const state = new PersistedState(cacheFile, CachedRequestState, {
    restartedRequests: [],
    failingRequests: [],
  });

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const allRequests = await fetchAllRequests(client, {
    actions: requestActions,
    statuses: requestStatuses,
    createdAtBefore,
    createdAtAfter,
  });
  const requests = allRequests.filter(
    (request) => new Date(request.createdAt) < createdAt,
  );
  logger.info(`Found ${requests.length} requests to process`);

  if (copyIdentifiers) {
    logger.info('copyIdentifiers detected - All Identifiers will be copied.');
  }
  if (sendEmailReceipt) {
    logger.info('sendEmailReceipt detected - Email receipts will be sent.');
  }
  if (skipWaitingPeriod) {
    logger.info('skipWaitingPeriod detected - Waiting period will be skipped.');
  }

  // Validate request IDs
  if (requestIds.length > 0 && requestIds.length !== requests.length) {
    const missingRequests = difference(
      requestIds,
      requests.map(({ id }) => id),
    );
    if (missingRequests.length > 0) {
      logger.error(
        colors.red(
          `Failed to find the following requests by ID: ${missingRequests.join(
            ',',
          )}.`,
        ),
      );
      process.exit(1);
    }
  }

  // Map over the requests
  let total = 0;
  progressBar.start(requests.length, 0);
  await map(
    requests,
    async (request, ind) => {
      try {
        // Pull the request identifiers
        const requestIdentifiers = copyIdentifiers
          ? await fetchAllRequestIdentifiers(client, sombra, {
              requestId: request.id,
            })
          : [];

        // Make the GraphQL request to restart the request
        const requestResponse = await restartPrivacyRequest(
          sombra,
          {
            ...request,
            // override silent mode
            isSilent:
              !!silentModeBefore &&
              new Date(request.createdAt) < silentModeBefore
                ? true
                : request.isSilent,
          },
          {
            requestIdentifiers,
            skipWaitingPeriod,
            sendEmailReceipt,
            emailIsVerified,
          },
        );

        // Cache successful upload
        const restartedRequests = state.getValue('restartedRequests');
        restartedRequests.push({
          id: requestResponse.id,
          link: requestResponse.link,
          rowIndex: ind,
          coreIdentifier: requestResponse.coreIdentifier,
          attemptedAt: new Date().toISOString(),
        });
        await state.setValue(restartedRequests, 'restartedRequests');
      } catch (err) {
        const msg = `${err.message} - ${JSON.stringify(
          err.response?.body,
          null,
          2,
        )}`;
        const clientError = extractClientError(msg);

        const failingRequests = state.getValue('failingRequests');
        failingRequests.push({
          id: request.id,
          link: request.link,
          rowIndex: ind,
          coreIdentifier: request.coreIdentifier,
          attemptedAt: new Date().toISOString(),
          error: clientError || msg,
        });
        await state.setValue(failingRequests, 'failingRequests');
      }
      total += 1;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  // Log completion time
  logger.info(
    colors.green(
      `Completed restarting of requests in "${totalTime / 1000}" seconds.`,
    ),
  );

  // Log errors
  if (state.getValue('failingRequests').length > 0) {
    logger.error(
      colors.red(
        `Encountered "${state.getValue('failingRequests').length}" errors. ` +
          `See "${cacheFile}" to review the error messages and inputs.`,
      ),
    );
    process.exit(1);
  }
}
