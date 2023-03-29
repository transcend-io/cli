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

export const UPDATE_OR_CREATE_COOKIES = gql`
  mutation TranscendCliUpdateOrCreateCookies(
    $cookies: [UpdateOrCreateCookieInput!]!
    $airgapBundleId: ID!
  ) {
    updateOrCreateCookies(
      input: { airgapBundleId: $airgapBundleId, cookies: $cookies }
    ) {
      clientMutationId
    }
  }
`;

export const DATA_FLOWS = gql`
  query TranscendCliDataFlows(
    $first: Int!
    $airgapBundleId: ID!
    $offset: Int!
    $status: ConsentTrackerStatus
    $showZeroActivity: Boolean
  ) {
    dataFlows(
      first: $first
      offset: $offset
      filterBy: { status: $status, showZeroActivity: $showZeroActivity }
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
    $status: ConsentTrackerStatus
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
          csp
          unknownRequestPolicy
          unknownCookiePolicy
          syncEndpoint
          telemetryPartitioning
          signedIabAgreement
          uspapi
          syncGroups
          partition
        }
      }
    }
  }
`;

export const CREATE_CONSENT_MANAGER = gql`
  mutation TranscendCliCreateConsentManager($privacyCenterId: ID!) {
    createConsentManager(input: { privacyCenterId: $privacyCenterId }) {
      consentManager {
        id
      }
    }
  }
`;

export const UPDATE_CONSENT_MANAGER_TO_LATEST = gql`
  mutation TranscendCliUpdateConsentManagerToLatest(
    $airgapBundleId: ID!
    $bundleType: ConsentBundleType!
  ) {
    updateConsentManagerToLatestVersion(
      id: $airgapBundleId
      input: { bundleType: $bundleType }
    ) {
      clientMutationId
    }
  }
`;

export const DEPLOY_CONSENT_MANAGER = gql`
  mutation TranscendCliDeployConsentManager(
    $airgapBundleId: ID!
    $bundleType: ConsentBundleType!
  ) {
    deployConsentManagerBundle(
      id: $airgapBundleId
      input: { bundleType: $bundleType }
    ) {
      clientMutationId
    }
  }
`;

export const UPDATE_CONSENT_MANAGER_DOMAINS = gql`
  mutation TranscendCliUpdateConsentManagerDomains(
    $airgapBundleId: ID!
    $domains: [String!]!
  ) {
    updateConsentManagerDomains(
      input: { id: $airgapBundleId, domains: $domains }
    ) {
      clientMutationId
    }
  }
`;
