import { ConsentBundleType } from '@transcend-io/privacy-types';
import colors from 'colors';
import type { LocalContext } from '../../../context';
import { validateTranscendAuth } from '../../../lib/api-keys';
import { mapSeries } from '../../../lib/bluebird-replace';
import { updateConsentManagerVersionToLatest } from '../../../lib/consent-manager';
import { logger } from '../../../logger';

interface UpdateConsentManagerCommandFlags {
  auth: string;
  bundleTypes: ConsentBundleType[];
  deploy: boolean;
  transcendUrl: string;
}

export async function updateConsentManager(
  this: LocalContext,
  {
    auth,
    bundleTypes = [ConsentBundleType.Production, ConsentBundleType.Test],
    deploy,
    transcendUrl,
  }: UpdateConsentManagerCommandFlags,
): Promise<void> {
  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  // Handle single update
  if (typeof apiKeyOrList === 'string') {
    // Update consent manager
    await updateConsentManagerVersionToLatest({
      deploy,
      transcendUrl,
      auth: apiKeyOrList,
      bundleTypes,
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
        deploy,
        transcendUrl,
        auth: apiKey.apiKey,
        bundleTypes,
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
