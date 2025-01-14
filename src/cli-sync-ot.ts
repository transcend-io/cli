#!/usr/bin/env node
import { logger } from './logger';

import colors from 'colors';
import { parseCliSyncOtArguments, createOneTrustGotInstance } from './oneTrust';
import { OneTrustPullResource } from './enums';
import { syncOneTrustAssessments } from './oneTrust/helpers/syncOneTrustAssessments';

/**
 * Pull configuration from OneTrust down locally to disk
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-sync-ot.ts --hostname=customer.my.onetrust.com --auth=$ONE_TRUST_OAUTH_TOKEN --file=./oneTrustAssessment.json
 *
 * Standard usage
 * yarn cli-sync-ot --hostname=customer.my.onetrust.com --auth=$ONE_TRUST_OAUTH_TOKEN --file=./oneTrustAssessment.json
 */
async function main(): Promise<void> {
  const { file, fileFormat, hostname, auth, resource, debug, dryRun } =
    parseCliSyncOtArguments();

  // use the hostname and auth token to instantiate a client to talk to OneTrust
  const oneTrust = createOneTrustGotInstance({ hostname, auth });

  try {
    if (resource === OneTrustPullResource.Assessments) {
      await syncOneTrustAssessments({ oneTrust, file, fileFormat, dryRun });
    }
  } catch (err) {
    logger.error(
      colors.red(
        `An error occurred pulling the resource ${resource} from OneTrust: ${
          debug ? err.stack : err.message
        }`,
      ),
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced OneTrust ${resource} to disk at "${file}"!`,
    ),
  );
}

main();
