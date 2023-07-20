#!/usr/bin/env node

import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { mapSeries } from 'bluebird';
import { join } from 'path';
import fs, { existsSync, mkdirSync } from 'fs';
import {
  buildTranscendGraphQLClient,
  ConsentManagerMetricBin,
} from './graphql';
import { validateTranscendAuth } from './api-keys';
import { ADMIN_DASH_INTEGRATIONS, DEFAULT_TRANSCEND_API } from './constants';
import { pullConsentManagerMetrics } from './consent-manager';
import { writeCsv } from './cron';

/**
 * Pull down consent manager metrics for 1 or multiple consent managers
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-pull-consent-metrics.ts --folder=./consent-metrics/ --auth=$TRANSCEND_API_KEY --start=01/01/2023 --end=03/01/2023
 *
 * Standard usage
 * yarn tr-pull-consent-metrics --folder=./consent-metrics/ --auth=$TRANSCEND_API_KEY --start=01/01/2023 --end=03/01/2023
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    folder = './consent-metrics/',
    transcendUrl = DEFAULT_TRANSCEND_API,
    bin = '1d',
    auth,
    end,
    start,
  } = yargs(process.argv.slice(2));

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  // Ensure folder either does not exist or is not a file
  if (fs.existsSync(folder) && !fs.lstatSync(folder).isDirectory()) {
    logger.error(
      colors.red(
        'The provided argument "folder" was passed a file. expected: folder="./consent-metrics/"',
      ),
    );
    process.exit(1);
  }

  // Validate bin
  const parsedBin = bin as ConsentManagerMetricBin;
  if (!Object.values(ConsentManagerMetricBin).includes(parsedBin)) {
    logger.error(
      colors.red(
        `Failed to parse argument "bin" with value "${bin}"\n` +
          `Expected one of: \n${Object.values(ConsentManagerMetricBin).join(
            '\n',
          )}`,
      ),
    );
    process.exit(1);
  }

  // Parse the dates
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  if (Number.isNaN(startDate.getTime())) {
    logger.error(
      colors.red(
        `Start date provided is invalid date. Got --start="${start}" expected --start="01/01/2023"`,
      ),
    );
    process.exit(1);
  }
  if (Number.isNaN(endDate.getTime())) {
    logger.error(
      colors.red(
        `End date provided is invalid date. Got --end="${end}" expected --end="01/01/2023"`,
      ),
    );
    process.exit(1);
  }
  if (startDate > endDate) {
    logger.error(
      colors.red(
        `Got a start date "${startDate.toISOString()}" that was larger than the end date "${endDate.toISOString()}". ` +
          'Start date must be before end date.',
      ),
    );
    process.exit(1);
  }

  // Create the folder if it does not exist
  if (!existsSync(folder)) {
    mkdirSync(folder);
  }

  logger.info(
    colors.magenta(
      `Pulling consent metrics from start=${startDate.toString()} to end=${endDate.toISOString()} with bin size "${bin}"`,
    ),
  );

  // Sync to Disk
  if (typeof apiKeyOrList === 'string') {
    try {
      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKeyOrList);

      // Pull the metrics
      const configuration = await pullConsentManagerMetrics(client, {
        bin: parsedBin,
        start: startDate,
        end: endDate,
      });

      // Write to file
      Object.entries(configuration).forEach(([metricName, metrics]) => {
        metrics.forEach(({ points, name }) => {
          const file = join(folder, `${metricName}_${name}.csv`);
          logger.info(
            colors.magenta(`Writing configuration to file "${file}"...`),
          );
          writeCsv(
            file,
            points.map(({ key, value }) => ({
              timestamp: key,
              value,
            })),
          );
        });
      });
    } catch (err) {
      logger.error(
        colors.red(`An error occurred syncing the schema: ${err.message}`),
      );
      process.exit(1);
    }

    // Indicate success
    logger.info(
      colors.green(
        `Successfully synced consent metrics to disk in folder "${folder}"! View at ${ADMIN_DASH_INTEGRATIONS}`,
      ),
    );
  } else {
    const encounteredErrors: string[] = [];
    await mapSeries(apiKeyOrList, async (apiKey, ind) => {
      const prefix = `[${ind}/${apiKeyOrList.length}][${apiKey.organizationName}] `;
      logger.info(
        colors.magenta(
          `~~~\n\n${prefix}Attempting to pull consent metrics...\n\n~~~`,
        ),
      );

      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKey.apiKey);

      try {
        const configuration = await pullConsentManagerMetrics(client, {
          bin: parsedBin,
          start: startDate,
          end: endDate,
        });

        // ensure folder exists for that organization
        const subFolder = join(folder, apiKey.organizationName);
        if (!existsSync(subFolder)) {
          mkdirSync(subFolder);
        }

        // Write to file
        Object.entries(configuration).forEach(([metricName, metrics]) => {
          metrics.forEach(({ points, name }) => {
            const file = join(subFolder, `${metricName}_${name}.csv`);
            logger.info(
              colors.magenta(`Writing configuration to file "${file}"...`),
            );
            writeCsv(
              file,
              points.map(({ key, value }) => ({
                timestamp: key,
                value,
              })),
            );
          });
        });

        logger.info(
          colors.green(`${prefix}Successfully pulled configuration!`),
        );
      } catch (err) {
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
}

main();
