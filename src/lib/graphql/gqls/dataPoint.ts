import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const DATA_POINTS = gql`
  query TranscendCliDataPoints(
    $filterBy: DataPointFiltersInput
    $first: Int!
    $offset: Int!
  ) {
    dataPoints(
      filterBy: $filterBy
      first: $first
      offset: $offset
      useMaster: false
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: name, direction: ASC }
      ]
    ) {
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

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const DATA_POINT_COUNT = gql`
  query TranscendCliDataPointCount($filterBy: DataPointFiltersInput) {
    dataPoints(filterBy: $filterBy, useMaster: false) {
      totalCount
    }
  }
`;

// TODO: https://transcend.height.app/T-27909 - add orderBy
// isExportCsv: true
export const SUB_DATA_POINTS = gql`
  query TranscendCliSubDataPoints(
    $filterBy: SubDataPointFiltersInput
    $first: Int!
    $offset: Int!
  ) {
    subDataPoints(
      filterBy: $filterBy
      first: $first
      offset: $offset
      useMaster: false
    ) {
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

export const SUB_DATA_POINTS_COUNT = gql`
  query TranscendCliSubDataPointsCount($filterBy: SubDataPointFiltersInput) {
    subDataPoints(filterBy: $filterBy, useMaster: false) {
      totalCount
    }
  }
`;

export const SUB_DATA_POINTS_WITH_GUESSES = gql`
  query TranscendCliSubDataPointGuesses(
    $filterBy: SubDataPointFiltersInput
    $first: Int!
    $offset: Int!
  ) {
    subDataPoints(
      filterBy: $filterBy
      first: $first
      offset: $offset
      useMaster: false
    ) {
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

export const DATAPOINT_EXPORT = gql`
  query TranscendCliDataPointCsvExport(
    $filterBy: DataPointFiltersInput
    $first: Int!
  ) {
    dataPoints(filterBy: $filterBy, first: $first, useMaster: false) {
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
      }
    }
  }
`;
