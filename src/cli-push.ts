#!/usr/bin/env node

import yargs from 'yargs-parser';
import { logger } from './logger';
import { mapSeries } from 'bluebird';
import { existsSync } from 'fs';
import { readTranscendYaml } from './readTranscendYaml';
import colors from 'colors';
import {
  buildTranscendGraphQLClient,
  syncConfigurationToTranscend,
} from './graphql';

import { ADMIN_DASH_INTEGRATIONS } from './constants';
import { TranscendInput } from './codecs';
import { ObjByString } from '@transcend-io/type-utils';
import { validateTranscendAuth } from './api-keys';
import { mergeTranscendInputs } from './mergeTranscendInputs';

/**
 * Sync configuration to Transcend
 *
 * @param options - Options
 * @returns True if synced successfully, false if error occurs
 */
async function syncConfiguration({
  transcendUrl,
  auth,
  pageSize,
  publishToPrivacyCenter,
  contents,
}: {
  /** Transcend YAML */
  contents: TranscendInput;
  /** Transcend URL */
  transcendUrl: string;
  /** API key */
  auth: string;
  /** Page size */
  pageSize: number;
  /** Skip privacy center publish step */
  publishToPrivacyCenter: boolean;
}): Promise<boolean> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Sync to Transcend
  try {
    const encounteredError = await syncConfigurationToTranscend(
      contents,
      client,
      { pageSize, publishToPrivacyCenter },
    );
    return !encounteredError;
    return true;
  } catch (err) {
    logger.error(
      colors.red(
        `An unexpected error occurred syncing the schema: ${err.message}`,
      ),
    );
    return false;
  }
}

/**
 * Push the transcend.yml file remotely into a Transcend instance
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-push.ts --file=./examples/invalid.yml --auth=asd123 --variables=domain:acme.com,stage:staging
 *
 * Standard usage
 * yarn tr-push --file=./examples/invalid.yml --auth=asd123 --variables=domain:acme.com,stage:staging
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './transcend.yml',
    transcendUrl = 'https://api.transcend.io',
    auth,
    variables = '',
    pageSize = '',
    publishToPrivacyCenter,
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  // Parse out the variables
  const splitVars = variables.split(',').filter((x) => !!x);
  const vars: ObjByString = {};
  splitVars.forEach((variable) => {
    const [k, v] = variable.split(':');
    vars[k] = v;
  });

  // If file list is a CSV
  const fileList = file.split(',');
  if (fileList.length < 1) {
    throw new Error('No file specified!');
  }

  const transcendInputs = fileList.map((filePath) => {
    // Ensure yaml file exists on disk
    if (!existsSync(filePath)) {
      logger.error(
        colors.red(
          // eslint-disable-next-line max-len
          `The file path does not exist on disk: ${filePath}. You can specify the filepath using --file=./examples/transcend.yml`,
        ),
      );
      process.exit(1);
    } else {
      logger.info(colors.magenta(`Reading file "${filePath}"...`));
    }

    try {
      // Read in the yaml file and validate it's shape
      const newContents = readTranscendYaml(filePath, vars);
      logger.info(colors.green(`Successfully read in "${filePath}"`));
      return newContents;
    } catch (err) {
      logger.error(
        colors.red(
          `The shape of your yaml file is invalid with the following errors: ${err.message}`,
        ),
      );
      process.exit(1);
      throw err;
    }
  });
  const [base, ...rest] = transcendInputs;
  const contents = mergeTranscendInputs(base, ...rest);

  // Parse page size
  const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 50;

  // process a single API key
  if (typeof apiKeyOrList === 'string') {
    const success = await syncConfiguration({
      transcendUrl,
      auth: apiKeyOrList,
      contents,
      publishToPrivacyCenter: publishToPrivacyCenter === 'true',
      pageSize: parsedPageSize,
    });

    // exist with error code
    if (!success) {
      logger.info(
        colors.red(
          `Sync encountered errors. View output above for more information, or check out ${ADMIN_DASH_INTEGRATIONS}`,
        ),
      );

      process.exit(1);
    }
  } else {
    const encounteredErrors: string[] = [];
    await mapSeries(apiKeyOrList, async (apiKey, ind) => {
      const prefix = `[${ind}/${apiKeyOrList.length}][${apiKey.organizationName}] `;
      logger.info(
        colors.magenta(
          `~~~\n\n${prefix}Attempting to push configuration...\n\n~~~`,
        ),
      );

      const success = await syncConfiguration({
        transcendUrl,
        auth: apiKey.apiKey,
        contents,
        pageSize: parsedPageSize,
        publishToPrivacyCenter: publishToPrivacyCenter === 'true',
      });

      if (success) {
        logger.info(
          colors.green(`${prefix}Successfully pushed configuration!`),
        );
      } else {
        logger.error(colors.red(`${prefix}Failed to sync configuration.`));
        encounteredErrors.push(apiKey.organizationName);
      }
    });

    if (encounteredErrors.length > 0) {
      logger.info(
        colors.red(
          `Sync encountered errors for "${encounteredErrors.join(
            ',',
          )}". View output above for more information, or check out ${ADMIN_DASH_INTEGRATIONS}`,
        ),
      );

      process.exit(1);
    }
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced yaml file to Transcend! View at ${ADMIN_DASH_INTEGRATIONS}`,
    ),
  );
}

main();
