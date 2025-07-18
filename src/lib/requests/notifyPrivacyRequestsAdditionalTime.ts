import { RequestAction } from '@transcend-io/privacy-types';
import cliProgress from 'cli-progress';
import colors from 'colors';
import { DEFAULT_TRANSCEND_API } from '../../constants';
import { logger } from '../../logger';
import { map } from '../bluebird-replace';
import {
  buildTranscendGraphQLClient,
  fetchAllRequests,
  fetchAllTemplates,
  makeGraphQLRequest,
  NOTIFY_ADDITIONAL_TIME,
} from '../graphql';

/**
 * Mark a set of privacy requests to be in silent mode.
 * Note requests in silent mode are ignored
 *
 * @param options - Options
 * @returns The number of requests marked silent
 */
export async function notifyPrivacyRequestsAdditionalTime({
  requestActions = Object.values(RequestAction),
  auth,
  requestIds,
  createdAtBefore,
  days = 45,
  daysLeft = 10,
  createdAtAfter,
  emailTemplate = 'Additional Time Needed',
  concurrency = 100,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The request actions that should be restarted */
  requestActions?: RequestAction[];
  /** Filter for requests created before this date */
  createdAtBefore: Date;
  /** Filter for requests created after this date */
  createdAtAfter?: Date;
  /** Email template */
  emailTemplate?: string;
  /** Transcend API key authentication */
  auth: string;
  /** Number of days to extend request by */
  days?: number;
  /**
   * Only notify requests that have less than this number of days until they are considered expired.
   * This allows for re-running the command without notifying the same users multiple times
   */
  daysLeft?: number;
  /** Concurrency limit for approving */
  concurrency?: number;
  /** The set of privacy requests to notify */
  requestIds?: string[];
  /** API URL for Transcend backend */
  transcendUrl?: string;
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Time duration
  const t0 = Date.now();
  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  // Grab the template with that title
  const matchingTemplates = await fetchAllTemplates(client, emailTemplate);
  const exactTemplateMatch = matchingTemplates.find(
    (template) => template.title === emailTemplate,
  );
  if (!exactTemplateMatch) {
    throw new Error(`Failed to find a template with title: "${emailTemplate}"`);
  }

  // Pull in the requests
  let allRequests = await fetchAllRequests(client, {
    actions: requestActions,
    createdAtBefore,
    createdAtAfter,
    isSilent: false,
    isClosed: false,
    requestIds,
  });

  // Filter requests by daysLeft
  allRequests = allRequests.filter(
    (request) =>
      typeof request.daysRemaining === 'number' &&
      request.daysRemaining < daysLeft,
  );

  // Notify Transcend
  logger.info(
    colors.magenta(
      `Notifying "${allRequests.length}" that more time is needed.`,
    ),
  );

  let total = 0;
  progressBar.start(allRequests.length, 0);
  await map(
    allRequests,
    async (requestToNotify) => {
      await makeGraphQLRequest(client, NOTIFY_ADDITIONAL_TIME, {
        input: {
          requestId: requestToNotify.id,
          template: exactTemplateMatch.template.defaultMessage,
          subject: exactTemplateMatch.subject.defaultMessage,
          additionalTime: days,
        },
      });

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
      `Successfully marked ${total} requests as silent mode in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );
  return allRequests.length;
}
