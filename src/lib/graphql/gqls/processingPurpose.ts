import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// orderBy: [
//   { field: createdAt, direction: ASC }
//   { field: name, direction: ASC }
// ]
export const PROCESSING_PURPOSE_SUB_CATEGORIES = gql`
  query TranscendCliProcessingPurposeSubCategories(
    $first: Int!
    $offset: Int!
  ) {
    processingPurposeSubCategories(
      first: $first
      offset: $offset
      isExportCsv: true
      useMaster: false
    ) {
      nodes {
        id
        name
        purpose
        description
        teams {
          name
        }
        owners {
          email
        }
        attributeValues {
          attributeKey {
            name
          }
          name
        }
      }
    }
  }
`;

export const CREATE_PROCESSING_PURPOSE_SUB_CATEGORY = gql`
  mutation TranscendCliCreateProcessingPurposeSubCategory(
    $input: CreateProcessingPurposeCategoryInput!
  ) {
    createProcessingPurposeSubCategory(input: $input) {
      processingPurposeSubCategory {
        id
        name
        purpose
      }
    }
  }
`;

export const UPDATE_PROCESSING_PURPOSE_SUB_CATEGORIES = gql`
  mutation TranscendCliUpdateProcessingPurposeSubCategories(
    $input: UpdateProcessingPurposeSubCategoriesInput!
  ) {
    updateProcessingPurposeSubCategories(input: $input) {
      clientMutationId
    }
  }
`;
