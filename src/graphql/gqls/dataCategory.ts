import { gql } from 'graphql-request';

export const DATA_SUB_CATEGORIES = gql`
  query TranscendCliDataSubCategories($first: Int!, $offset: Int!) {
    dataSubCategories(
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
  mutation TranscendCliCreateDataSubCategory($input: DataSubCategoryInput!) {
    createDataSubCategory(input: $input) {
      dataSubCategory {
        id
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
