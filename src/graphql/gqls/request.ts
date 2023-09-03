import { gql } from 'graphql-request';

export const REQUESTS = gql`
  query TranscendCliRequests(
    $first: Int!
    $offset: Int!
    $filterBy: RequestFiltersInput!
  ) {
    requests(
      filterBy: $filterBy
      first: $first
      offset: $offset
      orderBy: [
        { field: createdAt, direction: ASC }
        # TODO: https://transcend.height.app/T-27909 - order by ID
        # { field: id, direction: ASC }
      ]
      # TODO: https://transcend.height.app/T-27909 - enable optimizations
      # isExportCsv: true
      useMaster: false
    ) {
      nodes {
        id
        createdAt
        email
        link
        status
        details
        isTest
        locale
        origin
        isSilent
        coreIdentifier
        type
        subjectType
        country
        countrySubDivision
        attributeValues {
          id
          name
          attributeKey {
            id
            name
          }
        }
      }
      totalCount
    }
  }
`;

export const APPROVE_PRIVACY_REQUEST = gql`
  mutation TranscendCliApprovePrivacyRequest($input: CommunicationInput!) {
    approveRequest(input: $input) {
      request {
        id
      }
    }
  }
`;
export const CANCEL_PRIVACY_REQUEST = gql`
  mutation TranscendCliCancelPrivacyRequest($input: CommunicationInput!) {
    cancelRequest(input: $input) {
      request {
        id
      }
    }
  }
`;

export const UPDATE_PRIVACY_REQUEST = gql`
  mutation TranscendCliUpdatePrivacyRequest($input: UpdateRequestInput!) {
    updateRequest(input: $input) {
      request {
        id
      }
    }
  }
`;
