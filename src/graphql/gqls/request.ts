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
