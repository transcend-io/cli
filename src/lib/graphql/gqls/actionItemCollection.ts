import { gql } from 'graphql-request';
// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
// useMaster: false
//       orderBy: [
//         { field: createdAt, direction: ASC }
//         { field: title, direction: ASC }
//       ]
export const GLOBAL_ACTION_ITEM_COLLECTIONS = gql`
  query TranscendCliGlobalActionItemCollectionss(
    $filterBy: GlobalActionItemCollectionFiltersInput!
  ) {
    globalActionItemCollections(filterBy: $filterBy) {
      nodes {
        id
        title
        description
        hidden
        productLine
      }
    }
  }
`;

export const CREATE_ACTION_ITEM_COLLECTION = gql`
  mutation TranscendCliCreateActionItemCollection(
    $input: CreateActionItemCollectionInput!
  ) {
    createActionItemCollection(input: $input) {
      created {
        id
        title
      }
    }
  }
`;

export const UPDATE_ACTION_ITEM_COLLECTION = gql`
  mutation TranscendCliUpdateActionItemCollection(
    $input: UpdateActionItemCollectionInput!
  ) {
    updateActionItemCollection(input: $input) {
      clientMutationId
    }
  }
`;
