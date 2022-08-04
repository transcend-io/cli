import { gql } from 'graphql-request';

export const DATA_SILOS = gql`
  query SchemaSyncDataSilos(
    $title: String
    $ids: [ID!]
    $first: Int!
    $offset: Int!
  ) {
    dataSilos(
      filterBy: { text: $title, ids: $ids }
      first: $first
      offset: $offset
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

export const DATA_SILO = gql`
  query SchemaSyncDataSilo($id: String!) {
    dataSilo(id: $id) {
      id
      title
      description
      type
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
`;

export const UPDATE_DATA_SILO = gql`
  mutation SchemaSyncUpdateDataSilo(
    $id: ID!
    $title: String
    $description: String
    $url: String
    $headers: [CustomHeaderInput!]
    $notifyEmailAddress: String
    $identifiers: [String!]
    $isLive: Boolean
    $dataSubjectBlockListIds: [ID!]
    $dependedOnDataSiloTitles: [String!]
    $ownerEmails: [String!]
    $teamNames: [String!]
    $apiKeyId: ID
  ) {
    updateDataSilo(
      input: {
        id: $id
        title: $title
        description: $description
        url: $url
        headers: $headers
        notifyEmailAddress: $notifyEmailAddress
        identifiers: $identifiers
        isLive: $isLive
        dataSubjectBlockListIds: $dataSubjectBlockListIds
        dependedOnDataSiloTitles: $dependedOnDataSiloTitles
        ownerEmails: $ownerEmails
        teamNames: $teamNames
        apiKeyId: $apiKeyId
      }
    ) {
      clientMutationId
    }
  }
`;

export const CREATE_DATA_SILO = gql`
  mutation SchemaSyncCreateDataSilo(
    $title: String!
    $description: String!
    $url: String
    $headers: [CustomHeaderInput!]
    $type: String!
    $identifiers: [String!]
    $isLive: Boolean!
    $notifyEmailAddress: String
    $dataSubjectBlockListIds: [ID!]
    $dependedOnDataSiloTitles: [String!]
    $ownerEmails: [String!]
    $teamNames: [String!]
    $apiKeyId: ID
  ) {
    connectDataSilo(
      input: {
        name: $type
        title: $title
        description: $description
        url: $url
        headers: $headers
        notifyEmailAddress: $notifyEmailAddress
        identifiers: $identifiers
        isLive: $isLive
        dataSubjectBlockListIds: $dataSubjectBlockListIds
        dependedOnDataSiloTitles: $dependedOnDataSiloTitles
        ownerEmails: $ownerEmails
        apiKeyId: $apiKeyId
        teamNames: $teamNames
      }
    ) {
      dataSilo {
        id
        title
        type
        catalog {
          hasAvcFunctionality
        }
      }
    }
  }
`;

export const UPDATE_PROMPT_A_VENDOR_SETTINGS = gql`
  mutation UpdatePromptAVendorEmailSendSettings(
    $dataSiloId: ID!
    $notifyEmailAddress: String
    $promptAVendorEmailSendFrequency: Int
    $promptAVendorEmailSendType: PromptAVendorEmailSendType
    $promptAVendorEmailIncludeIdentifiersAttachment: Boolean
    $promptAVendorEmailCompletionLinkType: PromptAVendorEmailCompletionLinkType
    $manualWorkRetryFrequency: String
  ) {
    updatePromptAVendorEmailSendSettings(
      input: {
        dataSiloId: $dataSiloId
        notifyEmailAddress: $notifyEmailAddress
        promptAVendorEmailSendFrequency: $promptAVendorEmailSendFrequency
        promptAVendorEmailSendType: $promptAVendorEmailSendType
        promptAVendorEmailIncludeIdentifiersAttachment: $promptAVendorEmailIncludeIdentifiersAttachment
        promptAVendorEmailCompletionLinkType: $promptAVendorEmailCompletionLinkType
        manualWorkRetryFrequency: $manualWorkRetryFrequency
      }
    ) {
      clientMutationId
    }
  }
`;
