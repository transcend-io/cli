import type { LocalContext } from '../../../context';
import { logger } from '../../../logger';
import colors from 'colors';
import { writeFileSync } from 'node:fs';
import { validateTranscendAuth } from '../../../lib/api-keys';
import { buildXdiSyncEndpoint as buildXdiSyncEndpointHelper } from '../../../lib/consent-manager';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface BuildXdiSyncEndpointCommandFlags {
  auth: string;
  xdiLocation: string;
  file: string;
  removeIpAddresses: boolean;
  domainBlockList: string[];
  xdiAllowedCommands: string;
  transcendUrl: string;
}

export async function buildXdiSyncEndpoint(
  this: LocalContext,
  {
    auth,
    xdiLocation,
    file,
    removeIpAddresses,
    domainBlockList,
    xdiAllowedCommands,
    transcendUrl,
  }: BuildXdiSyncEndpointCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  // Build the sync endpoint
  const { syncGroups, html } = await buildXdiSyncEndpointHelper(apiKeyOrList, {
    xdiLocation,
    transcendUrl,
    removeIpAddresses,
    domainBlockList: domainBlockList.length > 0 ? domainBlockList : undefined,
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
