import { gql } from 'graphql-request';

export const POLICIES = gql`
  query TranscendCliFetchPolicies($url: String!) {
    privacyCenterPolicies(lookup: { url: $url }) {
      id
      title {
        defaultMessage
      }
      disableEffectiveOn
      disabledLocales
      versions {
        effectiveOn
        content {
          defaultMessage
        }
      }
    }
  }
`;

export const UPDATE_POLICIES = gql`
  mutation TranscendCliUpdatePolicies(
    $policies: [PolicyInput!]!
    $privacyCenterId: ID!
  ) {
    updatePolicies(
      input: {
        privacyCenterId: $privacyCenterId
        policies: $policies
        skipPublish: true
      }
    ) {
      clientMutationId
    }
  }
`;
