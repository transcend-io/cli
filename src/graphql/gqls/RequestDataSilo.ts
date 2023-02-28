import { gql } from 'graphql-request';

export const REQUEST_DATA_SILOS = gql`
  query TranscendCliRequestDataSilos($requestId: ID!, $dataSiloId: ID!) {
    requestDataSilos(
      filterBy: { requestId: $requestId, dataSiloId: $dataSiloId }
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

export const RETRY_REQUEST_DATA_SILO_STATUS = gql`
  mutation TranscendCliRetryRequestDataSilo($requestDataSiloId: ID!) {
    retryRequestDataSilo(id: $requestDataSiloId) {
      requestDataSilo {
        id
      }
    }
  }
`;
