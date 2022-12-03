import { gql } from 'graphql-request';

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

export const UPDATE_OR_CREATE_DATA_POINT = gql`
  mutation TranscendCliUpdateOrCreateDataPoint(
    $dataSiloId: ID!
    $name: String!
    $path: [String!]
    $title: String
    $description: String
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
        dataCollectionTag: $dataCollectionTag
        description: $description
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
