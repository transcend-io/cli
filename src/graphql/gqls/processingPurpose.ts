import { gql } from 'graphql-request';

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
      orderBy: [
        { field: createdAt, direction: ASC }
        { field: name, direction: ASC }
      ]
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
    $input: ProcessingPurposeSubCategoryInput!
  ) {
    createProcessingPurposeSubCategory(input: $input) {
      processingPurposeSubCategory {
        id
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
