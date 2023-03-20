import { gql } from 'graphql-request';

export const PURPOSES = gql`
  query TranscendCliPurposes {
    purposes {
      purposes {
        id
        name
      }
    }
  }
`;

export const CREATE_DATA_FLOWS = gql`
  mutation TranscendCliCreateDataFlows(
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

export const UPDATE_DATA_FLOWS = gql`
  mutation TranscendCliUpdateDataFlows($dataFlows: [UpdateDataFlowInput!]!) {
    updateDataFlows(input: { dataFlows: $dataFlows }) {
      dataFlows {
        id
      }
    }
  }
`;

export const CREATE_COOKIES = gql`
  mutation TranscendCliCreateCookies(
    $cookies: [CookieInput!]!
    $airgapBundleId: ID!
  ) {
    createCookies(
      input: { airgapBundleId: $airgapBundleId, cookies: $cookies }
    ) {
      dataFlows {
        id
      }
    }
  }
`;
export const DATA_FLOWS = gql`
  query TranscendCliDataFlows(
    $first: Int!
    $airgapBundleId: ID!
    $offset: Int!
    $status: DataFlowStatus
  ) {
    dataFlows(
      first: $first
      offset: $offset
      filterBy: { status: $status }
      input: { airgapBundleId: $airgapBundleId }
    ) {
      nodes {
        id
        value
        type
        description
        trackingType
        service {
          integrationName
        }
        source
        status
        owners {
          email
        }
        teams {
          name
        }
        attributeValues {
          name
          attributeKey {
            name
          }
        }
      }
    }
  }
`;

export const COOKIES = gql`
  query TranscendCliCookies(
    $first: Int!
    $offset: Int!
    $airgapBundleId: ID!
    $status: DataFlowStatus
  ) {
    cookies(
      first: $first
      offset: $offset
      filterBy: { status: $status }
      input: { airgapBundleId: $airgapBundleId }
    ) {
      nodes {
        id
        name
        isRegex
        description
        trackingPurposes
        service {
          integrationName
        }
        source
        status
        owners {
          email
        }
        teams {
          name
        }
        attributeValues {
          name
          attributeKey {
            name
          }
        }
      }
    }
  }
`;

export const FETCH_CONSENT_MANAGER_ID = gql`
  query TranscendCliFetchConsentManagerId {
    consentManager {
      consentManager {
        id
      }
    }
  }
`;

export const FETCH_CONSENT_MANAGER = gql`
  query TranscendCliFetchConsentManager {
    consentManager {
      consentManager {
        id
        configuration {
          domains
        }
      }
    }
  }
`;
