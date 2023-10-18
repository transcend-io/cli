import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const USERS = gql`
  query TranscendCliUsers(
    $first: Int!
    $offset: Int!
    $input: TeamFiltersInput
  ) {
    users(
      first: $first
      offset: $offset
      filterBy: $input
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: email, direction: ASC }
      ]
    ) {
      nodes {
        id
        name
        email
      }
    }
  }
`;
