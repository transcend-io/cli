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

export const EXPERIENCES = gql`
  query TranscendCliExperiences($first: Int!, $offset: Int!) {
    experiences(first: $first, offset: $offset) {
      nodes {
        id
        name
        displayName
        regions {
          countrySubDivision
          country
        }
        operator
        displayPriority
        viewState
        purposes {
          name
        }
        optedOutPurposes {
          name
        }
        browserLanguages
        browserTimeZones
      }
    }
  }
`;

export const CREATE_DATA_FLOWS = gql`
  mutation TranscendCliCreateDataFlows(
    $dataFlows: [DataFlowInput!]!
    $airgapBundleId: ID!
    $classifyService: Boolean
  ) {
    createDataFlows(
      input: {
        airgapBundleId: $airgapBundleId
        dataFlows: $dataFlows
        classifyService: $classifyService
      }
    ) {
      dataFlows {
        id
      }
    }
  }
`;

export const UPDATE_DATA_FLOWS = gql`
  mutation TranscendCliUpdateDataFlows(
    $airgapBundleId: ID!
    $dataFlows: [UpdateDataFlowInput!]!
    $classifyService: Boolean
  ) {
    updateDataFlows(
      input: {
        airgapBundleId: $airgapBundleId
        dataFlows: $dataFlows
        classifyService: $classifyService
      }
    ) {
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
        bundleURL
        testBundleURL
        configuration {
          domains
          consentPrecedence
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

export const UPDATE_CONSENT_MANAGER_PARTITION = gql`
  mutation TranscendCliUpdateConsentManagerPartition(
    $airgapBundleId: ID!
    $partition: String!
  ) {
    updateConsentManagerPartition(
      input: { id: $airgapBundleId, partition: $partition }
    ) {
      clientMutationId
    }
  }
`;

export const UPDATE_TOGGLE_USP_API = gql`
  mutation TranscendCliToggleUspAPI($input: ToggleUspapiInput!) {
    toggleUspapi(input: $input) {
      clientMutationId
    }
  }
`;

export const TOGGLE_UNKNOWN_REQUEST_POLICY = gql`
  mutation TranscendCliToggleUnknownRequestPolicy(
    $input: ToggleUnknownRequestPolicyInput!
  ) {
    toggleUnknownRequestPolicy(input: $input) {
      clientMutationId
    }
  }
`;

export const TOGGLE_UNKNOWN_COOKIE_POLICY = gql`
  mutation TranscendCliToggleUnknownCookiePolicy(
    $input: ToggleUnknownCookiePolicyInput!
  ) {
    toggleUnknownCookiePolicy(input: $input) {
      clientMutationId
    }
  }
`;

export const TOGGLE_TELEMETRY_PARTITION_STRATEGY = gql`
  mutation TranscendCliToggleTelemetryPartitionStrategy(
    $input: ToggleTelemetryPartitionStrategyInput!
  ) {
    toggleTelemetryPartitioning(input: $input) {
      clientMutationId
    }
  }
`;

export const TOGGLE_CONSENT_PRECEDENCE = gql`
  mutation TranscendCliToggleConsentPrecedence(
    $input: ToggleConsentPrecedenceInput!
  ) {
    toggleConsentPrecedence(input: $input) {
      clientMutationId
    }
  }
`;

export const UPDATE_CONSENT_EXPERIENCE = gql`
  mutation TranscendCliUpdateConsentExperience($input: UpdateExperienceInput!) {
    updateExperience(input: $input) {
      clientMutationId
    }
  }
`;

export const CREATE_CONSENT_EXPERIENCE = gql`
  mutation TranscendCliCreateConsentExperience($input: CreateExperienceInput!) {
    createExperience(input: $input) {
      clientMutationId
    }
  }
`;
