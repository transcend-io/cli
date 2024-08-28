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

export const UPDATE_PRIVACY_CENTER = gql`
  mutation TranscendCliUpdatePrivacyCenter($input: UpdatePrivacyCenterInput!) {
    updatePrivacyCenter(input: $input) {
      clientMutationId
    }
  }
`;
