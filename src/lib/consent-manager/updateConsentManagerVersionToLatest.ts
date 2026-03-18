import { ConsentBundleType } from '@transcend-io/privacy-types';
import { mapSeries } from '../bluebird';
import {
  updateConsentManagerToLatest,
  buildTranscendGraphQLClient,
  fetchConsentManagerId,
  deployConsentManager,
} from '../graphql';
import colors from 'colors';

import { logger } from '../../logger';
import { DEFAULT_TRANSCEND_API } from '../../constants';

/**
 * Update the consent manager to latest version
 *
 * @param options - Options
 */
export async function updateConsentManagerVersionToLatest({
  auth,
  deploy = false,
  transcendUrl = DEFAULT_TRANSCEND_API,
  bundleTypes = Object.values(ConsentBundleType),
}: {
  /** Transcend API key authentication */
  auth: string;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Deploy consent manager with this update */
  deploy?: boolean;
  /** The bundle types to update and deploy */
  bundleTypes?: ConsentBundleType[];
}): Promise<void> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Grab Consent Manager ID
  const consentManagerId = await fetchConsentManagerId(client);

  // Update each bundle type to latest version
  await mapSeries(bundleTypes, async (bundleType) => {
    logger.info(
      colors.magenta(
        `Update Consent Manager bundle with ID "${consentManagerId}" and type "${bundleType}" to latest version...`,
      ),
    );
    await updateConsentManagerToLatest(client, {
      id: consentManagerId,
      bundleType,
    });
    logger.info(
      colors.green(
        `Updated Consent Manager bundle with ID "${consentManagerId}" and type "${bundleType}" to latest version!`,
      ),
    );
  });

  // deploy Consent Managers
  if (deploy) {
    // Update each bundle type to latest version
    await mapSeries(bundleTypes, async (bundleType) => {
      logger.info(
        colors.magenta(
          `Deploying Consent Manager bundle with ID "${consentManagerId}" and type "${bundleType}"...`,
        ),
      );
      await deployConsentManager(client, {
        id: consentManagerId,
        bundleType,
      });
      logger.info(
        colors.green(
          `Deployed Consent Manager bundle with ID "${consentManagerId}" and type "${bundleType}"!`,
        ),
      );
    });
  }
}
