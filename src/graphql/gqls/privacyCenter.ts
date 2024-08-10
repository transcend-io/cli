import { gql } from 'graphql-request';

export const FETCH_PRIVACY_CENTER_ID = gql`
  query TranscendCliFetchPrivacyCenterId($url: String!) {
    privacyCenter(lookup: { url: $url }) {
      id
    }
  }
`;

export const DEPLOYED_PRIVACY_CENTER_URL = gql`
  query TranscendCliDeployedPrivacyCenterUrl {
    organization {
      deployedPrivacyCenterUrl
    }
  }
`;

export const PRIVACY_CENTER = gql`
  query TranscendCliFetchPrivacyCenters($url: String!) {
    privacyCenter(lookup: { url: $url }) {
      id
      url
      isDisabled
      showPrivacyRequestButton
      hideDataPractices
      showPolicies
      showTrackingTechnologies
      showCookies
      showDataFlows
      showConsentManager
      showManageYourPrivacy
      showPrivacyPreferences
      showMarketingPreferences
      showRequestsProcessedStats
      locales
      defaultLocale
      preferBrowserDefaultLocale
      supportEmail
      replyToEmail
      useNoReplyEmailAddress
      useCustomEmailDomain
      transformAccessReportJsonToCsv
      themeStr
    }
  }
`;
