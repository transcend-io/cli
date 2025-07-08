#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';
import { ConsentBundleType } from '@transcend-io/privacy-types';
import { mapSeries } from 'bluebird';

import { logger } from '../logger';
import { updateConsentManagerVersionToLatest } from './consent-manager';
import { validateTranscendAuth } from './api-keys';
import { DEFAULT_TRANSCEND_API } from '../constants';

/**
 * Update the consent manager to latest version
 *
 * Requires an API key with scope "Manage Consent Manager Developer Settings".
 *
 * Dev Usage:
 * pnpm exec tsx ./src/cli-update-consent-manager-to-latest.ts --auth=$TRANSCEND_API_KEY
 *
 * Standard usage:
 * yarn tr-update-consent-manager --auth=$TRANSCEND_API_KEY
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    deploy = 'false',
    bundleTypes = Object.values(ConsentBundleType).join(','),
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  // Parse bundle types
  if (!bundleTypes) {
    logger.error(
      colors.red(
        'Missing required parameter "bundleTypes". e.g. --bundleTypes=PRODUCTION',
      ),
    );
    process.exit(1);
  }
  const bundleTypesParsed = bundleTypes.split(',') as ConsentBundleType[];
  const invalidBundleTypes = bundleTypesParsed.filter(
    (bundleType) => !Object.values(ConsentBundleType).includes(bundleType),
  );
  if (invalidBundleTypes.length > 0) {
    logger.error(
      colors.red(
        `Received invalid bundle types: "${invalidBundleTypes.join(',')}"`,
      ),
    );
    process.exit(1);
  }

  // parse deploy status
  const shouldDeploy = deploy === 'true';

  // handle single update
  if (typeof apiKeyOrList === 'string') {
    // Update consent manager
    await updateConsentManagerVersionToLatest({
      deploy: shouldDeploy,
      transcendUrl,
      auth: apiKeyOrList,
      bundleTypes: bundleTypesParsed,
    });
    logger.info(colors.green('Successfully updated Consent Manager!'));
  } else {
    await mapSeries(apiKeyOrList, async (apiKey) => {
      logger.info(
        colors.magenta(
          `Updating Consent Manager for organization "${apiKey.organizationName}"...`,
        ),
      );

      await updateConsentManagerVersionToLatest({
        deploy: shouldDeploy,
        transcendUrl,
        auth: apiKey.apiKey,
        bundleTypes: bundleTypesParsed,
      });

      logger.info(
        colors.green(
          `Successfully updated Consent Manager for organization "${apiKey.organizationName}"!`,
        ),
      );
    });
    logger.info(colors.green('Successfully updated Consent Managers!'));
  }
}

main();
