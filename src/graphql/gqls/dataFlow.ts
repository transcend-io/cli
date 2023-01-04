import { gql } from 'graphql-request';

export const CREATE_DATA_FLOWS = gql`
  mutation TranscendCreateDataFlows(
    $dataFlows: [DataFlowInput!]!
    $airgapBundleId: ID!
  ) {
    createDataFlows(
      input: { airgapBundleId: $airgapBundleId, dataFlows: $dataFlows }
    ) {
      dataFlows {
        id
      }
    }
  }
`;

export const FETCH_CONSENT_MANAGER = gql`
  query TranscendFetchConsentManager {
    consentManager {
      consentManager {
        id
      }
    }
  }
`;
