#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import uniq from 'lodash/uniq';
import { pullCustomSiloOutstandingIdentifiers, writeCsv } from './cron';
import { RequestAction } from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { splitCsvToList } from './requests';
import { map } from 'bluebird';
import {
  buildTranscendGraphQLClient,
  fetchRequestFilesForRequest,
} from './graphql';

/**
 * This is a temporary script that can be removed after the launch of workflows v2
 * TODO: https://transcend.height.app/T-39035 - remove this
 *
 * Requires an API key with:
 *  - scope for "View the Request Compilation"
 *
 * Dev Usage:
 * pnpm exec tsx ./src/cli-cron-pull-profiles.ts --auth=$TRANSCEND_API_KEY \
 *   --cronDataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --targetDataSiloId=40ec5df2-61f7-41e6-80d7-afe7c2f0e390 \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --fileTarget=/Users/michaelfarrell/Desktop/test-target.csv
 *
 * Standard usage:
 * yarn tr-cron-pull-identifiers --auth=$TRANSCEND_API_KEY  \
 *   --cronDataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --targetDataSiloId=40ec5df2-61f7-41e6-80d7-afe7c2f0e390 \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --fileTarget=/Users/michaelfarrell/Desktop/test-target.csv
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './cron-identifiers.csv',
    fileTarget = './cron-identifiers-target.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    sombraAuth,
    cronDataSiloId,
    targetDataSiloId,
    actions,
    pageLimit = '100',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    process.exit(1);
  }

  // Ensure cronDataSiloId
  if (!cronDataSiloId) {
    logger.error(
      colors.red(
        'A cronDataSiloId must be provided. You can specify using --cronDataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc',
      ),
    );
    process.exit(1);
  }

  // Ensure targetDataSiloId
  if (!targetDataSiloId) {
    logger.error(
      colors.red(
        'A targetDataSiloId must be provided. You can specify using --targetDataSiloId=40ec5df2-61f7-41e6-80d7-afe7c2f0e390',
      ),
    );
    process.exit(1);
  }

  // Ensure actions
  if (!actions) {
    logger.error(
      colors.red(
        'At least one action must be provided. You can specify using --actions=ERASURE',
      ),
    );
    process.exit(1);
  }

  // Validate actions
  const parsedActions = splitCsvToList(actions) as RequestAction[];
  const invalidActions = parsedActions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type) => !Object.values(RequestAction).includes(type as any),
  );
  if (invalidActions.length > 0) {
    logger.error(
      colors.red(
        `Failed to parse actions:"${invalidActions.join(',')}".\n` +
          `Expected one of: \n${Object.values(RequestAction).join('\n')}`,
      ),
    );
    process.exit(1);
  }

  // Pull down outstanding identifiers
  const { identifiersFormattedForCsv } =
    await pullCustomSiloOutstandingIdentifiers({
      transcendUrl,
      pageLimit: parseInt(pageLimit, 10),
      actions: parsedActions,
      auth,
      sombraAuth,
      dataSiloId: cronDataSiloId,
    });

  // Grab the requestIds from the list of silos to process
  const requestIds = identifiersFormattedForCsv.map(
    (d) => d.requestId as string,
  );

  // Create GraphQL client to connect to Transcend backend
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Pull down target identifiers
  const results = await map(
    uniq(requestIds),
    async (requestId) => {
      const results = await fetchRequestFilesForRequest(client, {
        requestId,
        dataSiloId: targetDataSiloId,
      });
      return results.map(({ fileName, remoteId }) => {
        if (!remoteId) {
          throw new Error(
            `Failed to find remoteId for ${fileName} request: ${requestId}`,
          );
        }
        return {
          RecordId: remoteId,
          Object: fileName
            .replace('.json', '')
            .split('/')
            .pop()
            ?.replace(' Information', ''),
          Comment: 'Customer data deletion request submitted via transcend.io',
        };
      });
    },
    {
      concurrency: 10,
    },
  );

  // Write CSV
  const headers = uniq(
    identifiersFormattedForCsv.map((d) => Object.keys(d)).flat(),
  );
  writeCsv(file, identifiersFormattedForCsv, headers);
  logger.info(
    colors.green(
      `Successfully wrote ${identifiersFormattedForCsv.length} identifiers to file "${file}"`,
    ),
  );

  const targetIdentifiers = results.flat();
  const headers2 = uniq(targetIdentifiers.map((d) => Object.keys(d)).flat());
  writeCsv(fileTarget, targetIdentifiers, headers2);
  logger.info(
    colors.green(
      `Successfully wrote ${targetIdentifiers.length} identifiers to file "${fileTarget}"`,
    ),
  );
}

main();
