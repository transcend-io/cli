import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { PrivacyCenterInput } from '../../codecs';
import { logger } from '../../logger';
import { fetchPrivacyCenterId } from './fetchPrivacyCenterId';
import { UPDATE_PRIVACY_CENTER } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Sync the privacy center
 *
 * @param client - GraphQL client
 * @param privacyCenter - The privacy center input
 * @returns Whether the privacy center was synced successfully
 */
export async function syncPrivacyCenter(
  client: GraphQLClient,
  privacyCenter: PrivacyCenterInput,
): Promise<boolean> {
  let encounteredError = false;
  logger.info(colors.magenta('Syncing privacy center...'));

  // Grab the privacy center ID
  const privacyCenterId = await fetchPrivacyCenterId(client);

  try {
    await makeGraphQLRequest(client, UPDATE_PRIVACY_CENTER, {
      input: {
        privacyCenterId,
        transformAccessReportJsonToCsv:
          privacyCenter.transformAccessReportJsonToCsv,
        useCustomEmailDomain: privacyCenter.useCustomEmailDomain,
        useNoReplyEmailAddress: privacyCenter.useNoReplyEmailAddress,
        replyToEmail: privacyCenter.replyToEmail,
        supportEmail: privacyCenter.supportEmail,
        preferBrowserDefaultLocale: privacyCenter.preferBrowserDefaultLocale,
        defaultLocale: privacyCenter.defaultLocale,
        locales: privacyCenter.locales,
        showMarketingPreferences: privacyCenter.showMarketingPreferences,
        showManageYourPrivacy: privacyCenter.showManageYourPrivacy,
        showPolicies: privacyCenter.showPolicies,
        showConsentManager: privacyCenter.showConsentManager,
        showDataFlows: privacyCenter.showDataFlows,
        showCookies: privacyCenter.showCookies,
        showTrackingTechnologies: privacyCenter.showTrackingTechnologies,
        showPrivacyRequestButton: privacyCenter.showPrivacyRequestButton,
        isDisabled: privacyCenter.isDisabled,
        ...(privacyCenter.theme
          ? {
              colorPalette: privacyCenter.theme.colors,
              componentStyles: privacyCenter.theme.componentStyles,
              textStyles: privacyCenter.theme.textStyles,
            }
          : {}),
      },
    });
    logger.info(colors.green('Successfully synced privacy center!'));
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(`Failed to create privacy center! - ${err.message}`),
    );
  }

  return !encounteredError;
}
