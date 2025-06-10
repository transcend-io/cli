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
      `Pulling ${
        skipRequestCount ? 'all' : totalRequestCount
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

  // map over each action
  if (!skipRequestCount) {
    progressBar.start(totalRequestCount, 0);
  }
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
      identifiers.push(
        ...pageIdentifiers.map((identifier) => {
          foundRequestIds.add(identifier.requestId);
          return {
            ...identifier,
            action,
          };
        }),
      );
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

  if (!skipRequestCount) {
    progressBar.stop();
  }
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully pulled ${identifiers.length} outstanding identifiers from ${
        foundRequestIds.size
      } requests in "${totalTime / 1000}" seconds!`,
    ),
  );

  // Write out to CSV
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
