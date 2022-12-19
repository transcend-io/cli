import { gql } from 'graphql-request';

export const REQUESTS = gql`
  query TranscendCliRequests(
    $first: Int!
    $offset: Int!
    $actions: [RequestAction!]!
    $statuses: [RequestStatus!]!
  ) {
    requests(
      filterBy: { type: $actions, status: $statuses }
      first: $first
      offset: $offset
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
