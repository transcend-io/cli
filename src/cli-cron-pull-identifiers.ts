#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import uniq from 'lodash/uniq';
import { pullCustomSiloOutstandingIdentifiers, writeCsv } from './cron';
import { RequestAction } from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from './constants';
import { splitCsvToList } from './requests';

/**
 * Pull the set of active identifiers for a cron job silo.
 *
 * Requires an API key with scope for the cron integration being checked on.
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-cron-pull-identifiers.ts --auth=$TRANSCEND_API_KEY \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 *
 * Standard usage:
 * yarn tr-cron-pull-identifiers --auth=$TRANSCEND_API_KEY  \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './cron-identifiers.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    sombraAuth,
    dataSiloId,
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
      dataSiloId,
    });

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
}

main();
