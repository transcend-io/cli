import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const DATA_SILOS = gql`
  query TranscendCliDataSilos(
    $filterBy: DataSiloFiltersInput!
    $first: Int!
    $offset: Int!
  ) {
    dataSilos(
      filterBy: $filterBy
      first: $first
      offset: $offset
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: title, direction: ASC }
      ]
      useMaster: false
    ) {
      nodes {
        id
        title
        link
        type
        catalog {
          hasAvcFunctionality
        }
      }
    }
  }
`;

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const DATA_SILOS_ENRICHED = gql`
  query TranscendCliDataSilosEnriched(
    $filterBy: DataSiloFiltersInput!
    $first: Int!
    $offset: Int!
  ) {
    dataSilos(
      filterBy: $filterBy
      first: $first
      offset: $offset
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: title, direction: ASC }
      ]
      useMaster: false
    ) {
      nodes {
        id
        title
        description
        type
        outerType
        link
        country
        countrySubDivision
        url
        notifyEmailAddress
        attributeValues {
          attributeKey {
            name
          }
          name
        }
        apiKeys {
          title
        }
        subjectBlocklist {
          type
        }
        identifiers {
          name
          isConnected
        }
        dependentDataSilos {
          title
        }
        owners {
          email
        }
        teams {
          id
          name
        }
        catalog {
          hasAvcFunctionality
        }
        isLive
        promptAVendorEmailSendFrequency
        promptAVendorEmailSendType
        promptAVendorEmailIncludeIdentifiersAttachment
        promptAVendorEmailCompletionLinkType
        manualWorkRetryFrequency
      }
    }
  }
`;

export const UPDATE_DATA_SILOS = gql`
  mutation TranscendCliUpdateDataSilo($input: UpdateDataSilosInput!) {
    updateDataSilos(input: $input) {
      clientMutationId
      dataSilos {
        id
        title
      }
    }
  }
`;

export const CREATE_DATA_SILOS = gql`
  mutation TranscendCliCreateDataSilo($input: [CreateDataSilosInput!]!) {
    createDataSilos(input: $input) {
      dataSilos {
        id
        title
      }
    }
  }
`;
