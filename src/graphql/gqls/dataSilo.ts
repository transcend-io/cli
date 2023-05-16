import { gql } from 'graphql-request';

export const DATA_SILOS = gql`
  query TranscendCliDataSilos(
    $title: String
    $ids: [ID!]
    $types: [String!]
    $first: Int!
    $offset: Int!
  ) {
    dataSilos(
      filterBy: { text: $title, ids: $ids, type: $types }
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
  query TranscendCliDataSilo($id: String!) {
    dataSilo(id: $id) {
      id
      title
      description
      type
      outerType
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
  mutation TranscendCliUpdateDataSilo(
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
    $attributes: [AttributeInput!]
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
        attributes: $attributes
      }
    ) {
      clientMutationId
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

export const CREATE_DATA_SILO = gql`
  mutation TranscendCliCreateDataSilo(
    $title: String!
    $description: String!
    $url: String
    $headers: [CustomHeaderInput!]
    $type: String!
    $outerType: String
    $identifiers: [String!]
    $isLive: Boolean!
    $attributes: [AttributeInput!]
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
        outerType: $outerType
        url: $url
        attributes: $attributes
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
