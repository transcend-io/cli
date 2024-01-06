import { gql } from 'graphql-request';

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// orderBy: [
//   { field: createdAt, direction: ASC }
//   { field: name, direction: ASC }
// ]
export const DATA_SUB_CATEGORIES = gql`
  query TranscendCliDataSubCategories($first: Int!, $offset: Int!) {
    dataSubCategories(
      first: $first
      offset: $offset
      isExportCsv: true
      useMaster: false
    ) {
      nodes {
        id
        name
        category
        description
        regex
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

export const CREATE_DATA_SUB_CATEGORY = gql`
  mutation TranscendCliCreateDataSubCategory(
    $input: CreateDataInventorySubCategoryInput!
  ) {
    createDataSubCategory(input: $input) {
      dataSubCategory {
        id
        name
        category
      }
    }
  }
`;

export const UPDATE_DATA_SUB_CATEGORIES = gql`
  mutation TranscendCliUpdateDataSubCategories(
    $input: UpdateDataSubCategoriesInput!
  ) {
    updateDataSubCategories(input: $input) {
      clientMutationId
    }
  }
`;
