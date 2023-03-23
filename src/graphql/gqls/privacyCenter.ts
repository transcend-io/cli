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
