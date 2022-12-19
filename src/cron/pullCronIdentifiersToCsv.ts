import { createSombraGotInstance } from '../graphql';
import colors from 'colors';
import uniq from 'lodash/uniq';
import {
  pullCronPageOfIdentifiers,
  CronIdentifier,
} from './pullCronPageOfIdentifiers';
import { RequestAction } from '@transcend-io/privacy-types';
import { writeCsv } from './writeCsv';
import { logger } from '../logger';

/**
 * Pull the set of cron job identifiers to CSV
 *
 * @param options - Options
 */
export async function pullCronIdentifiersToCsv({
  file,
  dataSiloId,
  auth,
  sombraAuth,
  requestType,
  pageLimit = 100,
  transcendUrl = 'https://api.transcend.io',
}: {
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Data Silo ID to pull down jobs for */
  dataSiloId: string;
  /** The request action to fetch */
  requestType: RequestAction;
  /** Page limit when fetching identifiers */
  pageLimit?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
}): Promise<CronIdentifier[]> {
  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  logger.info(
    colors.magenta(
      `Pulling identifier for data silo: ${dataSiloId} of type ${requestType}`,
    ),
  );

  let offset = 0;
  const identifiers: CronIdentifier[] = [];
  let shouldContinue = true;

  // Fetch a page of identifiers
  while (shouldContinue) {
    // eslint-disable-next-line no-await-in-loop
    const pageIdentifiers = await pullCronPageOfIdentifiers(sombra, {
      dataSiloId,
      limit: pageLimit,
      offset,
      requestType,
    });
    identifiers.push(...pageIdentifiers);
    shouldContinue = pageIdentifiers.length === pageLimit;
    offset += pageLimit;
  }

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
  const headers = uniq(data.map((d) => Object.keys(d)).flat());
  writeCsv(file, data, headers);

  logger.info(
    colors.green(
      `Successfully wrote ${identifiers.length} identifiers to file "${file}"`,
    ),
  );

  return identifiers;
}
