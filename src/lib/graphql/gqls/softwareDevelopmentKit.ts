import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
export const SOFTWARE_DEVELOPMENT_KITS = gql`
  query TranscendCliSoftwareDevelopmentKits(
    $first: Int!
    $offset: Int!
    $input: SoftwareDevelopmentKitFiltersInput
  ) {
    softwareDevelopmentKits(
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
        codePackageType
        documentationLinks
        repositoryUrl
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

export const UPDATE_SOFTWARE_DEVELOPMENT_KITS = gql`
  mutation TranscendCliUpdateSoftwareDevelopmentKits(
    $input: UpdateSoftwareDevelopmentKitsInput!
  ) {
    updateSoftwareDevelopmentKits(input: $input) {
      clientMutationId
      softwareDevelopmentKits {
        id
        name
        description
        codePackageType
        documentationLinks
        repositoryUrl
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

export const CREATE_SOFTWARE_DEVELOPMENT_KIT = gql`
  mutation TranscendCliCreateSoftwareDevelopmentKit(
    $input: CreateSoftwareDevelopmentKitInput!
  ) {
    createSoftwareDevelopmentKit(input: $input) {
      clientMutationId
      softwareDevelopmentKit {
        id
        name
        description
        codePackageType
        documentationLinks
        repositoryUrl
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
