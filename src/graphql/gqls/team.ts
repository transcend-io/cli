import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const TEAMS = gql`
  query TranscendCliTeams(
    $first: Int!
    $offset: Int!
    $input: TeamFiltersInput
  ) {
    teams(
      first: $first
      offset: $offset
      filterBy: $input
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: name, direction: ASC }
      ]
    ) {
      nodes {
        id
        name
      }
    }
  }
`;
