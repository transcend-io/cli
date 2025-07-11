import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const CODE_PACKAGES = gql`
  query TranscendCliCodePackages(
    $first: Int!
    $offset: Int!
    $input: CodePackageFiltersInput
  ) {
    codePackages(
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
        type
        relativePath
        teams {
          id
          name
        }
        owners {
          id
          email
        }
        repository {
          id
          name
        }
        dataSilo {
          id
          title
          type
        }
      }
    }
  }
`;

export const UPDATE_CODE_PACKAGES = gql`
  mutation TranscendCliUpdateCodePackages($input: UpdateCodePackagesInput!) {
    updateCodePackages(input: $input) {
      clientMutationId
      codePackages {
        id
        name
        description
        type
        relativePath
        teams {
          id
          name
        }
        owners {
          id
          email
        }
        repository {
          id
          name
        }
        dataSilo {
          id
          title
          type
        }
      }
    }
  }
`;

export const CREATE_CODE_PACKAGE = gql`
  mutation TranscendCliCreateCodePackage($input: CreateCodePackageInput!) {
    createCodePackage(input: $input) {
      clientMutationId
      codePackage {
        id
        name
        description
        type
        relativePath
        teams {
          id
          name
        }
        owners {
          id
          email
        }
        repository {
          id
          name
        }
        dataSilo {
          id
          title
          type
        }
      }
    }
  }
`;
