import { gql } from 'graphql-request';

export const REQUESTS = gql`
  query TranscendCliRequests(
    $first: Int!
    $offset: Int!
    $filterBy: RequestFiltersInput!
  ) {
    requests(filterBy: $filterBy, first: $first, offset: $offset) {
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

export const APPROVE_PRIVACY_REQUESTS = gql`
  mutation TranscendCliApprovePrivacyRequest($input: CommunicationInput!) {
    approveRequest(input: $input) {
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
