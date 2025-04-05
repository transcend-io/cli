#!/usr/bin/env node

import fg from 'fast-glob';
import yargs from 'yargs-parser';
import colors from 'colors';
import { map } from 'bluebird';
import chunk from 'lodash/chunk';
import { DEFAULT_TRANSCEND_API } from './constants';
import { logger } from './logger';
import cliProgress from 'cli-progress';
import { createSombraGotInstance } from './graphql';
import { PreferenceState } from './preference-management/codecs';
import { PersistedState } from '@transcend-io/persisted-state';
import { existsSync, statSync } from 'fs';
import type { PreferenceUpdateItem } from '@transcend-io/privacy-types';

/**
 * Retry failed preference updates from receipt files
 *
 * @param root0 - The options object
 * @param root0.auth - The Transcend API key
 * @param root0.sombraAuth - Sombra API key authentication
 * @param root0.path - Path to receipt file or directory containing receipt files
 * @param root0.transcendUrl - API URL for Transcend backend
 * @param root0.skipWorkflowTriggers - Skip workflow triggers
 */
export async function retryFailedUpdates({
  auth,
  sombraAuth,
  path,
  transcendUrl = DEFAULT_TRANSCEND_API,
  skipWorkflowTriggers = false,
  /** Whether to force workflow triggers */
  forceTriggerWorkflows = false,

}: {
  /** The Transcend API key */
  auth: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Path to receipt file or directory containing receipt files */
  path: string;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Skip workflow triggers */
  skipWorkflowTriggers?: boolean;
  /** Whether to force workflow triggers */
  forceTriggerWorkflows?: boolean;
}): Promise<void> {
  logger.info(colors.magenta(`Retry failed updates from path: ${path}`));
  logger.info(colors.magenta(`Transcend URL: ${transcendUrl}`));
  logger.info(colors.magenta(`Skip workflow triggers: ${skipWorkflowTriggers}`));
  logger.info(colors.magenta(`Force trigger workflows: ${forceTriggerWorkflows}`));

  if (!existsSync(path)) {
    logger.error(colors.red(`Path does not exist: ${path}`));
    return;
  }

  const stats = statSync(path);
  const receiptFiles = stats.isDirectory()
    ? await fg('**/*-receipts.json', {
      cwd: path,
      absolute: true,
    })
    : [path];

  if (receiptFiles.length === 0) {
    logger.info(colors.yellow('No receipt files found to process.'));
    return;
  }

  logger.info(
    colors.magenta(
      `Found ${receiptFiles.length} receipt files to process`,
    ),
  );

  // Create sombra instance
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Process each receipt file
  await map(
    receiptFiles,
    async (receiptFile) => {
      try {
        // Read and parse the receipt file
        const preferenceState = new PersistedState(receiptFile, PreferenceState, {
          fileMetadata: {},
          failingUpdates: {},
          pendingUpdates: {},
        });
        const failingUpdates = preferenceState.getValue('failingUpdates');
        const pendingUpdates = preferenceState.getValue('pendingUpdates');

        if (Object.keys(failingUpdates).length === 0) {
          logger.info(
            colors.green(
              `No failing updates found in ${receiptFile}`,
            ),
          );
          return;
        }

        logger.info(
          colors.magenta(
            `Processing ${Object.keys(failingUpdates).length} failing updates from ${receiptFile}`,
          ),
        );

        // Create progress bar
        const progressBar = new cliProgress.SingleBar(
          {},
          cliProgress.Presets.shades_classic,
        );

        // Process updates in chunks
        const updatesToRun = Object.entries(failingUpdates);
        const chunkedUpdates = chunk(updatesToRun, skipWorkflowTriggers ? 100 : 10);
        let total = 0;
        progressBar.start(updatesToRun.length, 0);

        // Track successful updates
        const successfulUpdates: Record<string, PreferenceUpdateItem> = {};

        await map(
          chunkedUpdates,
          async (currentChunk) => {
            const validUpdates = currentChunk.filter(([, { update }]) => update.userId.length > 0);
            try {
              await sombra
                .put('v1/preferences', {
                  json: {
                    records: validUpdates.map(([, { update }]) => update),
                    skipWorkflowTriggers,
                    forceTriggerWorkflows,
                  },
                })
                .json();

              // Track successful updates
              currentChunk.forEach(([userId, { update }]) => {
                successfulUpdates[userId] = update;
              });
            } catch (err) {
              try {
                const parsed = JSON.parse(err?.response?.body || '{}');
                if (parsed.error) {
                  logger.error(colors.red(`Error: ${parsed.error}`));
                }
              } catch (e) {
                // continue
              }
              logger.error(
                colors.red(
                  `Failed to upload ${currentChunk.length} user preferences: ${err?.response?.body || err?.message
                  }`,
                ),
              );
            }

            total += currentChunk.length;
            progressBar.update(total);
          },
          {
            concurrency: 40,
          },
        );

        progressBar.stop();

        // Update the receipt file with successful updates
        if (Object.keys(successfulUpdates).length > 0) {
          // Remove successful updates from failingUpdates
          Object.keys(successfulUpdates).forEach((userId) => {
            delete failingUpdates[userId];
          });

          // Add successful updates to pendingUpdates
          Object.entries(successfulUpdates).forEach(([userId, update]) => {
            pendingUpdates[userId] = update;
          });

          // Save changes to the receipt file
          await preferenceState.setValue(failingUpdates, 'failingUpdates');
          await preferenceState.setValue(pendingUpdates, 'pendingUpdates');

          logger.info(
            colors.green(
              `Successfully processed ${Object.keys(successfulUpdates).length} updates in ${receiptFile}`,
            ),
          );
        }

        if (Object.keys(failingUpdates).length > 0) {
          logger.info(
            colors.yellow(
              `${Object.keys(failingUpdates).length} updates still failing in ${receiptFile}`,
            ),
          );
        }
      } catch (err) {
        logger.error(
          colors.red(
            `Error processing receipt file ${receiptFile}: ${err.message}`,
          ),
        );
      }
    },
    { concurrency: 1 },
  );
}

/**
 * Retry failed preference updates from receipt files
 *
 * Dev Usage:
 * yarn ts-node ./src/retry-failed-updates --auth=$TRANSCEND_CONSENT_API_KEY --path=./receipts
 * yarn ts-node ./src/retry-failed-updates --auth=$TRANSCEND_CONSENT_API_KEY --path=./receipts/file-receipts.json
 *
 * Standard usage:
 * yarn tr-retry-failed-updates --auth=$TRANSCEND_CONSENT_API_KEY --path=./receipts
 * yarn tr-retry-failed-updates --auth=$TRANSCEND_CONSENT_API_KEY --path=./receipts/file-receipts.json
 */
async function main(): Promise<void> {
  const {
    auth,
    sombraAuth,
    transcendUrl,
    forceTriggerWorkflows,
    path,
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  if (!path) {
    logger.error(colors.red('Please provide a path to a receipt file or directory containing receipt files'));
    process.exit(1);
  }

  await retryFailedUpdates({
    auth,
    sombraAuth,
    path,
    transcendUrl,
    forceTriggerWorkflows: forceTriggerWorkflows === 'true',
  });
}

main();
