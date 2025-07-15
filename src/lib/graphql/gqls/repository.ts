import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const REPOSITORIES = gql`
  query TranscendCliRepositories(
    $first: Int!
    $offset: Int!
    $input: RepositoryFiltersInput
  ) {
    repositories(
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
        description
        url
        teams {
          id
          name
        }
        owners {
          id
          email
        }
      }
    }
  }
`;

export const UPDATE_REPOSITORIES = gql`
  mutation TranscendCliUpdateRepositories($input: UpdateRepositoriesInput!) {
    updateRepositories(input: $input) {
      clientMutationId
      repositories {
        id
        name
        url
        teams {
          id
          name
        }
        owners {
          id
          email
        }
      }
    }
  }
`;

export const CREATE_REPOSITORY = gql`
  mutation TranscendCliCreateRepository($input: CreateRepositoryInput!) {
    createRepository(input: $input) {
      clientMutationId
      repository {
        id
        name
        url
        teams {
          id
          name
        }
        owners {
          id
          email
        }
      }
    }
  }
`;
