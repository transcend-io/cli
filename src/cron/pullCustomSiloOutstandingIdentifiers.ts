import { createSombraGotInstance } from '../graphql';
import colors from 'colors';
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

  logger.info(
    colors.magenta(
      `Pulling outstanding request identifiers for data silo: "${dataSiloId}" for requests of types "${actions.join(
        '", "',
      )}"`,
    ),
  );

  // identifiers found in total
  const identifiers: CronIdentifierWithAction[] = [];

  // map over each action
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
        ...pageIdentifiers.map((identifier) => ({
          ...identifier,
          action,
        })),
      );
      shouldContinue = pageIdentifiers.length === pageLimit;
      offset += pageLimit;
    }
  });

  logger.info(
    colors.magenta(
      `Found: ${identifiers.length} outstanding identifiers to parse`,
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
