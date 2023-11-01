import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const DATA_POINTS = gql`
  query TranscendCliDataPoints(
    $dataSiloIds: [ID!]
    $first: Int!
    $offset: Int!
  ) {
    dataPoints(
      filterBy: { dataSilos: $dataSiloIds }
      first: $first
      offset: $offset
      useMaster: false
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: name, direction: ASC }
      ]
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
        owners {
          email
        }
        teams {
          name
        }
        name
        path
        actionSettings {
          type
          active
        }
        dataCollection {
          title {
            defaultMessage
          }
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

// TODO: https://transcend.height.app/T-27909 - add orderBy
// isExportCsv: true
export const SUB_DATA_POINTS = gql`
  query TranscendCliDataPoints(
    $dataPointIds: [ID!]
    $first: Int!
    $offset: Int!
  ) {
    subDataPoints(
      filterBy: { dataPoints: $dataPointIds }
      first: $first
      offset: $offset
      useMaster: false
    ) {
      totalCount
      nodes {
        id
        name
        description
        purposes {
          name
          purpose
        }
        categories {
          name
          category
        }
        accessRequestVisibilityEnabled
        erasureRequestRedactionEnabled
        attributeValues {
          attributeKey {
            name
          }
          name
        }
      }
    }
  }
`;

export const SUB_DATA_POINTS_WITH_GUESSES = gql`
  query TranscendCliDataPoints(
    $dataPointIds: [ID!]
    $first: Int!
    $offset: Int!
  ) {
    subDataPoints(
      filterBy: { dataPoints: $dataPointIds }
      first: $first
      offset: $offset
      useMaster: false
    ) {
      totalCount
      nodes {
        id
        name
        description
        purposes {
          name
          purpose
        }
        categories {
          name
          category
        }
        pendingCategoryGuesses {
          category {
            name
            category
          }
          status
          confidence
          confidenceLabel
          classifierVersion
        }
        accessRequestVisibilityEnabled
        erasureRequestRedactionEnabled
        attributeValues {
          attributeKey {
            name
          }
          name
        }
      }
    }
  }
`;

export const UPDATE_OR_CREATE_DATA_POINT = gql`
  mutation TranscendCliUpdateOrCreateDataPoint(
    $dataSiloId: ID!
    $name: String!
    $path: [String!]
    $title: String
    $description: String
    $ownerIds: [ID!]
    $ownerEmails: [String!]
    $teamNames: [String!]
    $teamIds: [ID!]
    $dataCollectionTag: String
    $querySuggestions: [DbIntegrationQuerySuggestionInput!]
    $enabledActions: [RequestActionObjectResolver!]
    $subDataPoints: [DataPointSubDataPointInput!]
  ) {
    updateOrCreateDataPoint(
      input: {
        dataSiloId: $dataSiloId
        name: $name
        path: $path
        title: $title
        teamNames: $teamNames
        ownerEmails: $ownerEmails
        dataCollectionTag: $dataCollectionTag
        description: $description
        ownerIds: $ownerIds
        teamIds: $teamIds
        querySuggestions: $querySuggestions
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
