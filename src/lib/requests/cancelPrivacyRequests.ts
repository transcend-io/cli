import { map } from '../bluebird-replace';
import colors from 'colors';
import { logger } from '../../logger';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import {
  UPDATE_PRIVACY_REQUEST,
  fetchAllRequests,
  makeGraphQLRequest,
  buildTranscendGraphQLClient,
  CANCEL_PRIVACY_REQUEST,
  fetchAllTemplates,
  Template,
} from '../graphql';
import cliProgress from 'cli-progress';
import { DEFAULT_TRANSCEND_API } from '../../constants';

/**
 * Cancel a set of privacy requests
 *
 * @param options - Options
 * @returns The number of requests canceled
 */
export async function cancelPrivacyRequests({
  requestActions,
  cancellationTitle,
  auth,
  requestIds,
  silentModeBefore,
  createdAtBefore,
  createdAtAfter,
  statuses = [
    RequestStatus.Compiling,
    RequestStatus.RequestMade,
    RequestStatus.Delayed,
    RequestStatus.Approving,
    RequestStatus.Secondary,
    RequestStatus.Enriching,
    RequestStatus.Waiting,
    RequestStatus.SecondaryApproving,
  ],
  concurrency = 50,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The request actions that should be restarted */
  requestActions: RequestAction[];
  /** Transcend API key authentication */
  auth: string;
  /** Concurrency limit for approving */
  concurrency?: number;
  /** The request statuses to cancel */
  statuses?: RequestStatus[];
  /** The set of privacy requests to cancel */
  requestIds?: string[];
  /** Mark these requests as silent mode if they were created before this date */
  silentModeBefore?: Date;
  /** Filter for requests created before this date */
  createdAtBefore?: Date;
  /** Filter for requests created after this date */
  createdAtAfter?: Date;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** The email template to use when canceling the requests */
  cancellationTitle?: string;
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Time duration
  const t0 = new Date().getTime();
  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // Grab the template with that title
  let cancelationTemplate: Template | undefined;
  if (cancellationTitle) {
    const matchingTemplates = await fetchAllTemplates(
      client,
      cancellationTitle,
    );
    const exactTitleMatch = matchingTemplates.find(
      (template) => template.title === cancellationTitle,
    );
    if (!exactTitleMatch) {
      throw new Error(
        `Failed to find a template with title: "${cancellationTitle}"`,
      );
    }
    cancelationTemplate = exactTitleMatch;
  }

  // Pull in the requests
  const allRequests = await fetchAllRequests(client, {
    actions: requestActions,
    createdAtBefore,
    createdAtAfter,
    statuses,
    requestIds,
  });

  // Notify Transcend
  logger.info(
    colors.magenta(
      `Canceling "${allRequests.length}" requests${
        cancelationTemplate
          ? ` Using template: ${cancelationTemplate.title}`
          : ''
      }.`,
    ),
  );

  let total = 0;
  progressBar.start(allRequests.length, 0);
  await map(
    allRequests,
    async (requestToCancel) => {
      // update request to silent mode if silentModeBefore is defined
      // and the request was created before silentModeBefore
      if (
        silentModeBefore &&
        new Date(silentModeBefore) > new Date(requestToCancel.createdAt)
      ) {
        await makeGraphQLRequest(client, UPDATE_PRIVACY_REQUEST, {
          input: {
            id: requestToCancel.id,
            isSilent: true,
          },
        });
      }

      // cancel the request
      await makeGraphQLRequest(client, CANCEL_PRIVACY_REQUEST, {
        input: {
          requestId: requestToCancel.id,
          ...(cancelationTemplate
            ? {
                subject: `Re: ${cancelationTemplate.subject.defaultMessage}`,
                template: cancelationTemplate.template.defaultMessage,
              }
            : {}),
        },
      });

      total += 1;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully canceled ${total} requests in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );
  return allRequests.length;
}
