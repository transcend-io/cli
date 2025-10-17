import { gql } from 'graphql-request';

export const CREATE_PREFERENCE_ACCESS_TOKENS = gql`
  mutation TranscendCliCreatePreferenceAccessTokens(
    $input: CreatePrivacyCenterAccessTokensInput!
  ) {
    createPrivacyCenterAccessTokens(input: $input) {
      nodes {
        token
      }
    }
  }
`;
