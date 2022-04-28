import { gql } from 'graphql-request';

export const ENRICHERS = gql`
  query SchemaSyncEnrichers($title: String, $first: Int!, $offset: Int!) {
    enrichers(filterBy: { text: $title }, first: $first, offset: $offset) {
      nodes {
        id
        title
        url
        type
        inputIdentifier {
          name
        }
        identifiers {
          name
        }
        actions
      }
    }
  }
`;

export const IDENTIFIERS = gql`
  query SchemaSyncIdentifiers($first: Int!, $offset: Int!) {
    identifiers(first: $first, offset: $offset) {
      nodes {
        id
        name
      }
    }
  }
`;

export const API_KEYS = gql`
  query SchemaSyncApiKeys($first: Int!, $offset: Int!, $titles: [String!]) {
    apiKeys(first: $first, offset: $offset, filterBy: { titles: $titles }) {
      nodes {
        id
        title
      }
    }
  }
`;

export const NEW_IDENTIFIER_TYPES = gql`
  query SchemaSyncNewIdentifierTypes {
    newIdentifierTypes {
      name
    }
  }
`;

export const CREATE_IDENTIFIER = gql`
  mutation SchemaSyncCreateIdentifier($name: String!, $type: IdentifierType!) {
    createIdentifier(input: { name: $name, type: $type }) {
      identifier {
        id
        name
      }
    }
  }
`;

export const CREATE_ENRICHER = gql`
  mutation SchemaSyncCreateEnricher(
    $title: String!
    $description: String!
    $url: String!
    $inputIdentifier: ID!
    $identifiers: [ID!]!
    $actions: [RequestAction!]!
  ) {
    createEnricher(
      input: {
        title: $title
        type: SERVER
        description: $description
        url: $url
        inputIdentifier: $inputIdentifier
        identifiers: $identifiers
        actions: $actions
      }
    ) {
      clientMutationId
    }
  }
`;

export const UPDATE_ENRICHER = gql`
  mutation SchemaSyncUpdateEnricher(
    $id: ID!
    $title: String!
    $description: String!
    $url: String!
    $inputIdentifier: ID!
    $identifiers: [ID!]!
    $actions: [RequestAction!]!
  ) {
    updateEnricher(
      input: {
        id: $id
        title: $title
        description: $description
        url: $url
        inputIdentifier: $inputIdentifier
        identifiers: $identifiers
        actions: $actions
      }
    ) {
      clientMutationId
    }
  }
`;

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
      isLive
    }
  }
`;

export const DATA_POINTS = gql`
  query SchemaSyncDataPoints($dataSiloIds: [ID!], $first: Int!, $offset: Int!) {
    dataPoints(
      filterBy: { dataSilos: $dataSiloIds }
      first: $first
      offset: $offset
    ) {
      totalCount
      nodes {
        id
        title {
          defaultMessage
        }
        description {
          defaultMessage
        }
        name
        purpose
        category
        actionSettings {
          type
          active
        }
        dbIntegrationQueries {
          query
          suggestedQuery
          requestType
        }
      }
    }
  }
`;

export const UPDATE_DATA_SILO = gql`
  mutation SchemaSyncUpdateDataSilo(
    $id: ID!
    $title: String
    $description: String
    $url: String
    $notifyEmailAddress: String
    $identifiers: [String!]
    $isLive: Boolean
    $dataSubjectBlockListIds: [ID!]
    $dependedOnDataSiloTitles: [String!]
    $ownerEmails: [String!]
    $apiKeyId: ID
  ) {
    updateDataSilo(
      input: {
        id: $id
        title: $title
        description: $description
        url: $url
        notifyEmailAddress: $notifyEmailAddress
        identifiers: $identifiers
        isLive: $isLive
        dataSubjectBlockListIds: $dataSubjectBlockListIds
        dependedOnDataSiloTitles: $dependedOnDataSiloTitles
        ownerEmails: $ownerEmails
        apiKeyId: $apiKeyId
      }
    ) {
      clientMutationId
    }
  }
`;

export const DATA_SUBJECTS = gql`
  query SchemaDataSubjects {
    internalSubjects {
      id
      type
    }
  }
`;

export const CREATE_DATA_SUBJECT = gql`
  mutation SchemaSyncCreateDataSubject($type: String!) {
    createSubject(input: { type: $type, title: $type, subjectClass: OTHER }) {
      subject {
        id
        type
      }
    }
  }
`;

export const UPDATE_OR_CREATE_DATA_POINT = gql`
  mutation SchemaSyncUpdateOrCreateDataPoint(
    $dataSiloId: ID!
    $name: String!
    $title: String
    $description: String
    $category: DataCategoryType
    $purpose: ProcessingPurpose
    $querySuggestions: [DbIntegrationQuerySuggestionInput!]
    $enabledActions: [RequestActionObjectResolver!]
    $subDataPoints: [DataPointSubDataPointInput!]
  ) {
    updateOrCreateDataPoint(
      input: {
        dataSiloId: $dataSiloId
        name: $name
        title: $title
        description: $description
        querySuggestions: $querySuggestions
        category: $category
        purpose: $purpose
        enabledActions: $enabledActions
        subDataPoints: $subDataPoints
      }
    ) {
      dataPoint {
        id
        name
      }
    }
  }
`;

export const CREATE_DATA_SILO = gql`
  mutation SchemaSyncCreateDataSilo(
    $title: String!
    $description: String!
    $url: String
    $type: String!
    $identifiers: [String!]
    $isLive: Boolean!
    $notifyEmailAddress: String
    $dataSubjectBlockListIds: [ID!]
    $dependedOnDataSiloTitles: [String!]
    $ownerEmails: [String!]
    $apiKeyId: ID
  ) {
    connectDataSilo(
      input: {
        name: $type
        title: $title
        description: $description
        url: $url
        notifyEmailAddress: $notifyEmailAddress
        identifiers: $identifiers
        isLive: $isLive
        dataSubjectBlockListIds: $dataSubjectBlockListIds
        dependedOnDataSiloTitles: $dependedOnDataSiloTitles
        ownerEmails: $ownerEmails
        apiKeyId: $apiKeyId
      }
    ) {
      dataSilo {
        id
        title
        type
      }
    }
  }
`;

export const ADD_SILO_DISCOVERY_RESULTS = gql`
  mutation AddSiloDiscoveryResults(
    $pluginId: ID!
    $rawResults: [SiloDiscoveryRawResultInput!]!
  ) {
    addSiloDiscoveryResults(
      input: { pluginId: $pluginId, rawResults: $rawResults }
    ) {
      success
    }
  }
`;

export const ENABLED_PLUGINS = gql`
  query Plugins($dataSiloId: String!, $type: PluginType!) {
    plugins(filterBy: { dataSiloId: $dataSiloId, type: $type, enabled: true }) {
      plugins {
        id
        dataSilo {
          type
        }
      }
      totalCount
    }
  }
`;
