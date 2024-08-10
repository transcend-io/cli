import { gql } from 'graphql-request';

export const POLICIES = gql`
  query TranscendCliFetchPolicies($url: String!) {
    privacyCenterPolicies(lookup: { url: $url }) {
      id
      title {
        defaultMessage
      }
      disabledLocales
      versions {
        content {
          defaultMessage
        }
      }
    }
  }
`;
