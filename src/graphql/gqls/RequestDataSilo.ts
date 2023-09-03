import { gql } from 'graphql-request';

export const REQUEST_DATA_SILOS = gql`
  query TranscendCliRequestDataSilos(
    $first: Int!
    $offset: Int!
    $filterBy: RequestDataSiloFiltersInput!
  ) {
    requestDataSilos(
      filterBy: $filterBy
      first: $first
      offset: $offset
      # TODO: https://transcend.height.app/T-27909 - enable optimizations
      # isExportCsv: true
      # useMaster: false
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: title, direction: ASC, model: dataSilo }
      ]
    ) {
      nodes {
        id
      }
    }
  }
`;

export const CHANGE_REQUEST_DATA_SILO_STATUS = gql`
  mutation TranscendCliMarkRequestDataSiloCompleted(
    $requestDataSiloId: ID!
    $status: UpdateRequestDataSiloStatus!
  ) {
    changeRequestDataSiloStatus(
      input: { id: $requestDataSiloId, status: $status }
    ) {
      requestDataSilo {
        id
      }
    }
  }
`;

export const RETRY_REQUEST_DATA_SILO = gql`
  mutation TranscendCliRetryRequestDataSilo($requestDataSiloId: ID!) {
    retryRequestDataSilo(id: $requestDataSiloId) {
      requestDataSilo {
        id
      }
    }
  }
`;
