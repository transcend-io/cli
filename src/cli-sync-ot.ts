#!/usr/bin/env node
import { logger } from './logger';

import colors from 'colors';
import { parseCliSyncOtArguments, createOneTrustGotInstance } from './oneTrust';
import { OneTrustPullResource, OneTrustPullSource } from './enums';
import { buildTranscendGraphQLClient } from './graphql';
import {
  syncOneTrustAssessmentsFromFile,
  syncOneTrustAssessmentsFromOneTrust,
} from './oneTrust/helpers';

/**
 * Pull configuration from OneTrust down locally to disk
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-sync-ot.ts --hostname=customer.my.onetrust.com --oneTrustAuth=$ONE_TRUST_OAUTH_TOKEN --transcendAuth=$TRANSCEND_API_KEY
 *
 * Standard usage
 * yarn cli-sync-ot --hostname=customer.my.onetrust.com --oneTrustAuth=$ONE_TRUST_OAUTH_TOKEN --transcendAuth=$TRANSCEND_API_KEY
 */
async function main(): Promise<void> {
  const {
    file,
    hostname,
    oneTrustAuth,
    transcendAuth,
    transcendUrl,
    resource,
    debug,
    dryRun,
    source,
  } = parseCliSyncOtArguments();

  // instantiate a client to talk to OneTrust
  const oneTrust =
    hostname && oneTrustAuth
      ? createOneTrustGotInstance({
          hostname,
          auth: oneTrustAuth,
        })
      : undefined;

  // instantiate a client to talk to Transcend
  const transcend =
    transcendUrl && transcendAuth
      ? buildTranscendGraphQLClient(transcendUrl, transcendAuth)
      : undefined;

  try {
    if (resource === OneTrustPullResource.Assessments) {
      if (source === OneTrustPullSource.OneTrust && oneTrust) {
        await syncOneTrustAssessmentsFromOneTrust({
          oneTrust,
          file,
          dryRun,
          ...(transcend && { transcend }),
        });
      } else if (source === OneTrustPullSource.File && file && transcend) {
        await syncOneTrustAssessmentsFromFile({ file, transcend });
      }
    }
  } catch (err) {
    logger.error(
      colors.red(
        `An error occurred syncing the resource ${resource} from OneTrust: ${
          debug ? err.stack : err.message
        }`,
      ),
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced OneTrust ${resource} to ${
        dryRun ? `disk at "${file}"` : 'Transcend'
      }!`,
    ),
  );
}

main();
