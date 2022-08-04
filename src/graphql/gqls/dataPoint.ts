import { gql } from 'graphql-request';

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
  query SchemaSyncDataPoints(
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
    $dataCollectionTag: String
    $querySuggestions: [DbIntegrationQuerySuggestionInput!]
    $enabledActions: [RequestActionObjectResolver!]
    $subDataPoints: [DataPointSubDataPointInput!]
  ) {
    updateOrCreateDataPoint(
      input: {
        dataSiloId: $dataSiloId
        name: $name
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
