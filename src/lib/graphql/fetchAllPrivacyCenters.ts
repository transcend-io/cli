import { GraphQLClient } from 'graphql-request';
import { PRIVACY_CENTER } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { LanguageKey } from '@transcend-io/internationalization';
import { PrivacyCenterThemePartial } from '@transcend-io/privacy-types';
import { fetchPrivacyCenterUrl } from './fetchPrivacyCenterId';

export interface PrivacyCenter {
  /** ID of the privacy center */
  id: string;
  /** The URL of the privacy center */
  url: string;
  /** Whether or not the entire privacy center is enabled or disabled */
  isDisabled: boolean;
  /** Whether or not to show the privacy requests button */
  showPrivacyRequestButton: boolean;
  /** Whether or not to show the policies page */
  showPolicies: boolean;
  /** Whether or not to show the tracking technologies page */
  showTrackingTechnologies: boolean;
  /** Whether or not to show the cookies on the tracking technologies page */
  showCookies: boolean;
  /** Whether or not to show the data flows on the tracking technologies page */
  showDataFlows: boolean;
  /** Whether or not to show the consent manager opt out options on the tracking technologies page */
  showConsentManager: boolean;
  /** Whether or not to show the manage your privacy page */
  showManageYourPrivacy: boolean;
  /** Whether or not to show the marketing preferences page */
  showMarketingPreferences: boolean;
  /** What languages are supported for the privacy center */
  locales: LanguageKey[];
  /** The default locale for the privacy center */
  defaultLocale: LanguageKey;
  /** Whether or not to prefer the browser default locale */
  preferBrowserDefaultLocale: boolean;
  /** The email addresses of the employees within your company that are the go-to individuals for managing this privacy center */
  supportEmail: string;
  /** The email addresses of the employees within your company that are the go-to individuals for managing this privacy center */
  replyToEmail: string;
  /** Whether or not to send emails from a no reply email */
  useNoReplyEmailAddress: boolean;
  /** Whether or not to use a custom email domain */
  useCustomEmailDomain: boolean;
  /** Whether or not to transcend access requests from JSON to CSV */
  transformAccessReportJsonToCsv: boolean;
  /** The theme object of colors to display on the privacy center */
  theme: PrivacyCenterThemePartial;
}

/**
 * Fetch all privacy centers in the organization
 *
 * @param client - GraphQL client
 * @returns All privacy centers in the organization
 */
export async function fetchAllPrivacyCenters(
  client: GraphQLClient,
): Promise<PrivacyCenter[]> {
  const deployedPrivacyCenterUrl = await fetchPrivacyCenterUrl(client);
  const {
    privacyCenter: { themeStr, ...rest },
  } = await makeGraphQLRequest<{
    /** Privacy centers */
    privacyCenter: Omit<PrivacyCenter, 'theme'> & {
      /** Theme string */
      themeStr: string;
    };
  }>(client, PRIVACY_CENTER, {
    url: deployedPrivacyCenterUrl,
  });

  return [
    {
      ...rest,
      theme: JSON.parse(themeStr),
    },
  ];
}
