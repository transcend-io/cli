#!/usr/bin/env node

// TODO DELETE

import yargs from 'yargs-parser';
import { logger } from '../logger';
import colors from 'colors';
import { writeFileSync } from 'fs';
import { validateTranscendAuth } from './api-keys';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { buildXdiSyncEndpoint } from './consent-manager';
import { splitCsvToList } from './requests';

/**
 * Build the Transcend Consent Manager XDI sync endpoint
 *
 * @see https://docs.transcend.io/docs/consent/reference/xdi#addxdihostscript(standalone)
 *
 * Dev Usage:
 * pnpm exec tsx ./src/cli-build-xdi-sync-endpoint.ts --xdiLocation=https://cdn.your-site.com/xdi.js
 *
 * Standard usage
 * yarn tr-build-xdi-sync-endpoint --xdiLocation=https://cdn.your-site.com/xdi.js
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    xdiLocation,
    file = './sync-endpoint.html',
    removeIpAddresses = 'true',
    domainBlockList = '',
    xdiAllowedCommands = 'ConsentManager:Sync',
  } = yargs(process.argv.slice(2));

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  // Parse block list setting
  const blockList = splitCsvToList(domainBlockList);

  // Build the sync endpoint
  const { syncGroups, html } = await buildXdiSyncEndpoint(apiKeyOrList, {
    xdiLocation,
    transcendUrl,
    removeIpAddresses: removeIpAddresses === 'true',
    domainBlockList: blockList.length > 0 ? blockList : undefined,
    xdiAllowedCommands,
  });

  // Log success
  logger.info(
    colors.green(
      `Successfully constructed sync endpoint for sync groups: ${JSON.stringify(
        syncGroups,
        null,
        2,
      )}`,
    ),
  );

  // Write to disk
  writeFileSync(file, html);
  logger.info(colors.green(`Wrote configuration to file "${file}"!`));
}

main();
