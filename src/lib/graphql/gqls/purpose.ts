import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
// orderBy: [
//   { field: createdAt, direction: ASC }
//   { field: name, direction: ASC }
// ]
export const PURPOSES = gql`
  query TranscendCliPurposes(
    $first: Int!
    $offset: Int!
    $filterBy: TrackingPurposeFiltersInput
    $input: TrackingPurposeInput!
  ) {
    purposes(
      first: $first
      offset: $offset
      filterBy: $filterBy
      input: $input
    ) {
      nodes {
        id
        name
        description
        defaultConsent
        trackingType
        configurable
        essential
        showInConsentManager
        isActive
        displayOrder
        optOutSignals
        deletedAt
        authLevel
        showInPrivacyCenter
        title
      }
    }
  }
`;

export const CREATE_PURPOSE = gql`
  mutation TranscendCliCreatePurpose($input: TrackingPurposeCreateInput!) {
    createPurpose(input: $input) {
      trackingPurpose {
        id
        name
        trackingType
      }
    }
  }
`;

export const UPDATE_PURPOSE = gql`
  mutation TranscendCliUpdatePurpose($input: TrackingPurposeUpdateInput!) {
    updatePurpose(input: $input) {
      trackingPurpose {
        id
        name
        trackingType
      }
    }
  }
`;
